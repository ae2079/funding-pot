import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  parseUnits,
  formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonZkEvm, baseSepolia } from 'viem/chains';
import { Inverter } from '@inverter-network/sdk';
import { AnkrProvider } from '@ankr.com/ankr.js';

import { getChain } from '../../../utils/testUtils/testHelpers.js';
import abis from '../../../data/abis.js';
import { requestedModules } from '../../../utils/testUtils/staticTestData.js';
import {
  getDeployArgs,
  adminMultisig,
} from './inputs/deploymentArgs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadProjectReport(projectName) {
  const outputPath = path.join(
    __dirname,
    '../../../data/production/output',
    projectName,
    '4.json'
  );

  if (!fs.existsSync(outputPath)) {
    console.error(
      `No output file found for project ${projectName} at ${outputPath}`
    );
    process.exit(1);
  }

  try {
    const outputData = JSON.parse(
      fs.readFileSync(outputPath, 'utf8')
    );
    return outputData;
  } catch (error) {
    console.error('Error processing output file:', error);
    process.exit(1);
  }
}

export function createClients(type = 'source') {
  let baseConfig;

  if (type === 'source') {
    baseConfig = {
      chain: polygonZkEvm,
      transport: http('https://zkevm-rpc.com'),
    };
  } else if (type === 'target') {
    baseConfig = {
      chain: baseSepolia,
      transport: http(process.env.RPC_URL),
    };
  }

  const account = privateKeyToAccount(process.env.PK);

  const publicClient = createPublicClient({
    ...baseConfig,
  });

  const walletClient = createWalletClient({
    ...baseConfig,
    account,
  });

  return {
    publicClient,
    walletClient,
  };
}

const getTokenSnapshot = async (token) => {
  const ankrProvider = new AnkrProvider(
    `https://rpc.ankr.com/multichain/${process.env.ANKR_API_KEY}`
  );

  let holders;

  let attempts = 0;
  for (let i = 0; i < 10; i++) {
    try {
      ({ holders } = await ankrProvider.getTokenHolders({
        contractAddress: token,
        blockchain: 'polygon_zkevm',
        pageSize: 10,
      }));
      break;
    } catch (e) {
      if (e.data.includes('context deadline exceeded')) {
        console.error('  ❌ Ankr API error, retrying...');
        attempts++;
      } else {
        throw e;
      }
    }
  }

  return holders;
};

export async function getState(projectConfig) {
  const { publicClient, walletClient } = createClients();

  const inverter = new Inverter({
    publicClient,
    walletClient,
  });

  const workflow = await inverter.getWorkflow({
    orchestratorAddress: projectConfig.ORCHESTRATOR,
    requestedModules,
  });

  const virtualIssuanceSupply =
    await workflow.fundingManager.read.getVirtualIssuanceSupply.run();
  const virtualCollateralSupply =
    await workflow.fundingManager.read.getVirtualCollateralSupply.run();

  const paymentRouter = await workflow.optionalModule
    .LM_PC_PaymentRouter_v1.address;
  const mintWrapper =
    await workflow.fundingManager.read.getIssuanceToken.run();

  const mintWrapperContract = getContract({
    address: mintWrapper,
    abi: abis.mintWrapperAbi,
    client: publicClient,
  });

  const issuanceToken =
    await mintWrapperContract.read.issuanceToken();

  const issuanceTokenContract = getContract({
    address: issuanceToken,
    abi: abis.erc20Abi,
    client: publicClient,
  });

  const paymentRouterBalance =
    await issuanceTokenContract.read.balanceOf([paymentRouter]);

  const totalIssuanceSupply =
    await issuanceTokenContract.read.totalSupply();

  const tokenSnapshot = await getTokenSnapshot(issuanceToken);

  const state = {
    virtualIssuanceSupply,
    virtualCollateralSupply,
    issuanceToken,
    paymentRouterBalance,
    paymentRouter,
    totalIssuanceSupply,
    tokenSnapshot,
  };

  return state;
}

export async function recreateIssuanceSnapshot(
  workflow,
  state,
  tokenToWrapper,
  report
) {
  console.info();
  console.info('> Recreating Token Snapshot');

  const { publicClient, walletClient } = createClients('target');

  const wrapper = tokenToWrapper[state.issuanceToken];

  if (!wrapper) {
    console.info('No wrapper found for token', state.issuanceToken);
    return;
  }

  // minting tokens
  console.info('    > Minting tokens');
  for (const entry of state.tokenSnapshot) {
    const { holderAddress, balanceRawInteger, balance } = entry;
    if (balanceRawInteger === 0n) continue;

    const newPaymentRouter =
      workflow.optionalModule.LM_PC_PaymentRouter_v1.address;

    const target =
      holderAddress.toLowerCase() ===
      state.paymentRouter.toLowerCase()
        ? newPaymentRouter
        : holderAddress;

    console.info(
      `         > Minting ${balance} tokens for ${target}${
        holderAddress.toLowerCase() ===
          state.paymentRouter.toLowerCase() && ' (new PaymentRouter)'
      }`
    );

    const hash = await walletClient.writeContract({
      address: wrapper,
      abi: abis.mintWrapperAbi,
      functionName: 'mint',
      args: [target, balanceRawInteger],
    });

    console.info('            > Transaction:', hash);

    // Wait for transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // self assigning vesting role
  console.info('    > Creating vestings');
  console.info('         > Self Assigning Payment Pusher Role');

  const tx1 =
    await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.grantModuleRole.run(
      [
        await workflow.optionalModule.LM_PC_PaymentRouter_v1.read.PAYMENT_PUSHER_ROLE.run(),
        walletClient.account.address,
      ]
    );

  await publicClient.waitForTransactionReceipt({ hash: tx1 });
  console.info('            > Transaction:', tx1);

  // creating vestings

  const { transactions, batchReports } = report;

  const allTransactions = [
    ...transactions.readable.flat(),
    ...Object.values(batchReports)
      .map((b) => b.transactions.readable.flat())
      .flat(),
  ];

  const allVestings = allTransactions
    .filter((t) => t.functionSignature.includes('pushPayment'))
    .map((t) => t.inputValues);

  const tranches = {};
  for (const vesting of allVestings) {
    const [, , , start, cliff, duration] = vesting;
    const id = `${start}-${cliff}-${duration}`;
    if (!tranches[id]) {
      tranches[id] = [];
    }
    tranches[id].push(vesting);
  }

  let recipients = [];
  let paymentTokens = [];
  let amounts = [];
  let start = 0;
  let cliff = 0;
  let end = 0;

  for (const tranchId in tranches) {
    const tranch = tranches[tranchId];

    for (let i = 0; i < tranch.length; i++) {
      const [
        recipient,
        paymentToken,
        amount,
        thisStart,
        thisCliff,
        thisEnd,
      ] = tranch[i];
      start = thisStart;
      cliff = thisCliff;
      end = thisEnd;
      recipients.push(recipient);
      paymentTokens.push(paymentToken);
      amounts.push(amount);

      if (recipients.length === 40 || i === tranch.length - 1) {
        console.info(
          '         > Creating vesting tranche:',
          recipients.length,
          `(start: ${start}, cliff: ${cliff}, end: ${end})`
        );
        const tx =
          await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.pushPaymentBatched.run(
            [
              recipients.length,
              recipients,
              paymentTokens,
              amounts,
              start,
              cliff,
              end,
            ]
          );
        await publicClient.waitForTransactionReceipt({ hash: tx });
        console.info('            > Transaction:', tx);

        recipients = [];
        paymentTokens = [];
        amounts = [];
        start = 0;
        cliff = 0;
        end = 0;
      }
    }
  }

  // removing vesting role

  console.info('         > Removing vesting role');

  const tx2 =
    await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.revokeModuleRole.run(
      [
        await workflow.optionalModule.LM_PC_PaymentRouter_v1.read.PAYMENT_PUSHER_ROLE.run(),
        walletClient.account.address,
      ]
    );

  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.info('            > Transaction:', tx2);
}

let targetSdk;

export async function deployWorkflow(state) {
  console.info();
  console.info('> Deploying Workflow');

  const { publicClient, walletClient } = createClients('target');

  targetSdk = new Inverter({
    publicClient,
    walletClient,
  });

  const { run } = await targetSdk.getDeploy({
    requestedModules,
    factoryType: 'default',
  });

  const args = getDeployArgs(
    targetSdk.walletClient.account.address,
    state.issuanceToken,
    state.virtualIssuanceSupply,
    state.virtualCollateralSupply
  );

  const { orchestratorAddress, transactionHash } = await run(args);

  await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  console.info('    > Workflow deployed at:', orchestratorAddress);

  return await targetSdk.getWorkflow({
    orchestratorAddress,
    requestedModules,
  });
}

export async function configureWorkflow(
  workflow,
  state,
  tokenToWrapper,
  report
) {
  console.info();
  console.info('> Configuring Workflow');

  // assign minting rights
  console.info('    > Setting minter...');

  const mintWrapper = tokenToWrapper[state.issuanceToken];
  const mintWrapperContract = getContract({
    address: mintWrapper,
    abi: abis.mintWrapperAbi,
    client: targetSdk.walletClient,
  });

  const tx1 = await mintWrapperContract.write.setMinter([
    workflow.fundingManager.address,
    true,
  ]);

  await targetSdk.publicClient.waitForTransactionReceipt({
    hash: tx1,
  });

  console.info('        > Transaction: ', tx1);

  // assigning curve interaction rights
  console.info(
    `    > Granting curve interaction rights to ${report.inputs.projectConfig.SAFE} (Funding Pot Multisig)`
  );
  const curveInteractionRole =
    await workflow.fundingManager.read.CURVE_INTERACTION_ROLE.run();

  const tx2 = await workflow.fundingManager.write.grantModuleRole.run(
    [curveInteractionRole, report.inputs.projectConfig.SAFE]
  );

  await targetSdk.publicClient.waitForTransactionReceipt({
    hash: tx2,
  });

  console.info('        > Transaction: ', tx2);

  // assign admin role to admin multisig
  console.info(`    > Granting admin role to ${adminMultisig}`);
  const tx3 = await workflow.authorizer.write.grantRole.run([
    await workflow.authorizer.read.getAdminRole.run(),
    adminMultisig,
  ]);

  await targetSdk.publicClient.waitForTransactionReceipt({
    hash: tx3,
  });

  console.info('        > Transaction: ', tx3);
}
