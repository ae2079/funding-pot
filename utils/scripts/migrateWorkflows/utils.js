import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  getAddress,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonZkEvm } from 'viem/chains';
import { Inverter } from '@inverter-network/sdk';
import { AnkrProvider } from '@ankr.com/ankr.js';

import { getChain } from '../../../utils/testUtils/testHelpers.js';
import abis from '../../../data/abis.js';
import { requestedModules } from '../../../utils/testUtils/staticTestData.js';
import {
  getDeployArgs,
  adminMultisig,
} from './input/deploymentArgs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getWrapperForToken = (tokenToWrapper, token) => {
  return tokenToWrapper[token.toLowerCase()];
};

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
      chain: getChain(process.env.CHAIN_ID),
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

export const getTokenSnapshot = async (token) => {
  const ankrProvider = new AnkrProvider(
    `https://rpc.ankr.com/multichain/${process.env.ANKR_API_KEY}`
  );

  let holders;

  let attempts = 0;
  for (let i = 0; i < 10; i++) {
    try {
      ({ holders } = await ankrProvider.getTokenHolders({
        contractAddress: token,
        blockchain: getNetworkIdString(process.env.CHAIN_ID),
        pageSize: 25,
      }));
      break;
    } catch (e) {
      console.log(e);
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
  console.info();
  console.info('> Retrieving Workflow State on zkevm');
  console.info();

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

  const paymentProcessor = await workflow.paymentProcessor.address;

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

  const query = `{
    LinearVesting(
      where: {chainId: {_eq: 1101}, streamingPaymentProcessor: {workflow: {address: {_eq: "${getAddress(
        projectConfig.ORCHESTRATOR
      )}"}}}}
    ) {
      recipient
      amount
      token {
        address
      }
      cliff
      end
      start
    }
  }`;

  const response = await fetch(
    'https://dev.indexer.inverter.network/v1/graphql',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    }
  );

  const {
    data: { LinearVesting },
  } = await response.json();

  const state = {
    virtualIssuanceSupply,
    virtualCollateralSupply,
    issuanceToken,
    paymentRouterBalance,
    paymentRouter,
    totalIssuanceSupply,
    tokenSnapshot,
    vestings: LinearVesting,
  };

  console.info('    > Workflow State:', state);

  return state;
}

export async function recreateIssuanceSnapshot(
  workflow,
  state,
  tokenToWrapper,
  migrationProtocol
) {
  console.info();
  console.info('> Recreating Token Snapshot');

  const { publicClient, walletClient } = createClients('target');

  const wrapper = getWrapperForToken(
    tokenToWrapper,
    state.issuanceToken
  );

  if (!wrapper) {
    console.info('No wrapper found for token', state.issuanceToken);
    return;
  }

  console.info('    > Granting minting rights to deployer');

  const grantMintingToDeployerPayload = {
    address: wrapper,
    functionName: 'setMinter',
    args: [walletClient.account.address, true],
  };

  try {
    const tx0 = await walletClient.writeContract({
      ...grantMintingToDeployerPayload,
      abi: abis.mintWrapperAbi,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx0 });
    console.info('        > Transaction: ', tx0);

    migrationProtocol.grantMintingToDeployerPayload = {
      grantMintingToDeployerPayload,
      status: 'success',
      hash: tx0,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);
    migrationProtocol.grantMintingToDeployerPayload = {
      grantMintingToDeployerPayload,
      status: 'failure',
      error: e.message,
    };
  }

  // minting tokens
  console.info('    > Minting tokens');
  migrationProtocol.mintPayloads = [];

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

    const mintPayload = {
      address: wrapper,
      functionName: 'mint',
      args: [target, balanceRawInteger.toString()],
    };

    try {
      const hash = await walletClient.writeContract({
        ...mintPayload,
        abi: abis.mintWrapperAbi,
      });

      console.info('            > Transaction:', hash);

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash });

      migrationProtocol.mintPayloads.push({
        mintPayload,
        status: 'success',
        hash,
      });
    } catch (e) {
      console.error('            > Error: ', e.message);
      migrationProtocol.mintPayloads.push({
        mintPayload,
        status: 'failure',
        error: e.message,
      });
    }
  }

  console.info('    > Revoking minting rights from deployer');
  const revokeMintingRightsFromDeployerPayload = {
    address: wrapper,
    functionName: 'setMinter',
    args: [walletClient.account.address, false],
  };

  try {
    const tx1 = await walletClient.writeContract({
      ...revokeMintingRightsFromDeployerPayload,
      abi: abis.mintWrapperAbi,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx1 });
    console.info('        > Transaction: ', tx1);

    migrationProtocol.revokeMintingRightsFromDeployerPayload = {
      revokeMintingRightsFromDeployerPayload,
      status: 'success',
      hash: tx1,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);
    migrationProtocol.revokeMintingRightsFromDeployerPayload = {
      revokeMintingRightsFromDeployerPayload,
      status: 'failure',
      error: e.message,
    };
  }

  // self assigning vesting role
  console.info('    > Creating vestings');
  console.info('         > Self Assigning Payment Pusher Role');

  const selfAssigningVestingPayloadViaSdk = {
    address: workflow.optionalModule.LM_PC_PaymentRouter_v1.address,
    functionName: 'grantModuleRole',
    args: [
      await workflow.optionalModule.LM_PC_PaymentRouter_v1.read.PAYMENT_PUSHER_ROLE.run(),
      walletClient.account.address,
    ],
  };

  try {
    const tx2 =
      await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.grantModuleRole.run(
        selfAssigningVestingPayloadViaSdk.args
      );
    await publicClient.waitForTransactionReceipt({ hash: tx2 });
    console.info('            > Transaction:', tx2);

    migrationProtocol.selfAssigningVestingPayloadViaSdk = {
      selfAssigningVestingPayloadViaSdk,
      status: 'success',
      hash: tx2,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);
    migrationProtocol.selfAssigningVestingPayloadViaSdk = {
      selfAssigningVestingPayloadViaSdk,
      status: 'failure',
      error: e.message,
    };
  }

  // creating vestings

  migrationProtocol.vestingBatches = [];
  const { vestings } = state;
  const tranches = {};
  for (const vesting of vestings) {
    const id = `${vesting.start}-${vesting.cliff}-${vesting.end}`;
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
      const vesting = tranch[i];
      start = vesting.start.toString();
      cliff = vesting.cliff.toString();
      end = vesting.end.toString();
      recipients.push(vesting.recipient);
      paymentTokens.push(vesting.token.address);
      amounts.push(parseUnits(vesting.amount, 18).toString());

      if (recipients.length === 40 || i === tranch.length - 1) {
        console.info(
          '         > Creating vesting tranche:',
          recipients.length,
          `(start: ${start}, cliff: ${cliff}, end: ${end})`
        );

        const pushPaymentBatchedPayloadViaSdk = {
          address:
            workflow.optionalModule.LM_PC_PaymentRouter_v1.address,
          functionName: 'pushPaymentBatched',
          args: [
            recipients.length,
            recipients,
            paymentTokens,
            amounts,
            start,
            cliff,
            end,
          ],
        };

        try {
          const tx =
            await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.pushPaymentBatched.run(
              pushPaymentBatchedPayloadViaSdk.args
            );

          await publicClient.waitForTransactionReceipt({ hash: tx });
          console.info('            > Transaction:', tx);

          migrationProtocol.vestingBatches.push({
            pushPaymentBatchedPayloadViaSdk,
            status: 'success',
            hash: tx,
          });
        } catch (e) {
          console.error('            > Error: ', e.message);

          migrationProtocol.vestingBatches.push({
            pushPaymentBatchedPayloadViaSdk,
            status: 'failure',
            error: e.message,
          });
        }

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

  const revokeVestingRolePayloadViaSdk = {
    address: workflow.optionalModule.LM_PC_PaymentRouter_v1.address,
    functionName: 'revokeModuleRole',
    args: [
      await workflow.optionalModule.LM_PC_PaymentRouter_v1.read.PAYMENT_PUSHER_ROLE.run(),
      walletClient.account.address,
    ],
  };

  try {
    const tx3 =
      await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.revokeModuleRole.run(
        revokeVestingRolePayloadViaSdk.args
      );

    await publicClient.waitForTransactionReceipt({ hash: tx3 });
    console.info('            > Transaction:', tx3);

    migrationProtocol.revokeVestingRolePayloadViaSdk = {
      revokeVestingRolePayloadViaSdk,
      status: 'success',
      hash: tx3,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);
    migrationProtocol.revokeVestingRolePayloadViaSdk = {
      revokeVestingRolePayloadViaSdk,
      status: 'failure',
      error: e.message,
    };
  }

  return migrationProtocol;
}

let targetSdk;

export async function deployWorkflow(
  state,
  tokenToWrapper,
  migrationProtocol
) {
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
    getWrapperForToken(tokenToWrapper, state.issuanceToken),
    state.virtualIssuanceSupply,
    state.virtualCollateralSupply
  );

  migrationProtocol.deployWorkflowArgs = args;

  const { orchestratorAddress, transactionHash } = await run(args);

  await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  console.info('    > Workflow deployed at:', orchestratorAddress);

  return {
    migrationProtocol,
    workflow: await targetSdk.getWorkflow({
      orchestratorAddress,
      requestedModules,
    }),
  };
}

export async function configureWorkflow(
  workflow,
  state,
  tokenToWrapper,
  report,
  migrationProtocol
) {
  console.info();
  console.info('> Configuring Workflow');

  const mintWrapper = getWrapperForToken(
    tokenToWrapper,
    state.issuanceToken
  );
  const mintWrapperContract = getContract({
    address: mintWrapper,
    abi: abis.mintWrapperAbi,
    client: targetSdk.walletClient,
  });

  console.info('    > Setting bonding curve as minter...');
  const setBondingCurveAsMinterPayload = {
    address: mintWrapper,
    functionName: 'setMinter',
    args: [workflow.fundingManager.address, true],
  };

  try {
    const tx1 = await mintWrapperContract.write.setMinter(
      setBondingCurveAsMinterPayload.args
    );

    await targetSdk.publicClient.waitForTransactionReceipt({
      hash: tx1,
    });

    console.info('        > Transaction: ', tx1);

    migrationProtocol.setBondingCurveAsMinterPayload = {
      setBondingCurveAsMinterPayload,
      status: 'success',
      hash: tx1,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);
    migrationProtocol.setBondingCurveAsMinterPayload = {
      setBondingCurveAsMinterPayload,
      status: 'failure',
      error: e.message,
    };
  }

  // assigning curve interaction rights
  console.info(
    `    > Granting curve interaction rights to ${report.inputs.projectConfig.SAFE} (Funding Pot Multisig)`
  );

  const grantCurveInteractionRightsPayload = {
    address: workflow.fundingManager.address,
    functionName: 'grantModuleRole',
    args: [
      await workflow.fundingManager.read.CURVE_INTERACTION_ROLE.run(),
      report.inputs.projectConfig.SAFE,
    ],
  };

  try {
    const curveInteractionRole =
      await workflow.fundingManager.read.CURVE_INTERACTION_ROLE.run();

    const tx2 =
      await workflow.fundingManager.write.grantModuleRole.run(
        grantCurveInteractionRightsPayload.args
      );

    await targetSdk.publicClient.waitForTransactionReceipt({
      hash: tx2,
    });

    console.info('        > Transaction: ', tx2);

    migrationProtocol.grantCurveInteractionRightsPayload = {
      grantCurveInteractionRightsPayload,
      status: 'success',
      hash: tx2,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);
    migrationProtocol.grantCurveInteractionRightsPayload = {
      grantCurveInteractionRightsPayload,
      status: 'failure',
      error: e.message,
    };
  }

  console.info(
    `    > Granting payment pusher rights to ${report.inputs.projectConfig.SAFE} (Funding Pot Multisig)`
  );
  const paymentPusher =
    await workflow.optionalModule.LM_PC_PaymentRouter_v1.read.PAYMENT_PUSHER_ROLE.run();

  const grantPaymentPusherRightsPayload = {
    address: workflow.optionalModule.LM_PC_PaymentRouter_v1.address,
    functionName: 'grantModuleRole',
    args: [paymentPusher, report.inputs.projectConfig.SAFE],
  };

  try {
    const tx3 =
      await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.grantModuleRole.run(
        grantPaymentPusherRightsPayload.args
      );

    await targetSdk.publicClient.waitForTransactionReceipt({
      hash: tx3,
    });

    console.info('        > Transaction: ', tx3);

    migrationProtocol.grantPaymentPusherRightsPayload = {
      grantPaymentPusherRightsPayload,
      status: 'success',
      hash: tx3,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);

    migrationProtocol.grantPaymentPusherRightsPayload = {
      grantPaymentPusherRightsPayload,
      status: 'failure',
      error: e.message,
    };
  }

  // assign admin role to admin multisig
  console.info(`    > Granting admin role to ${adminMultisig}`);
  const grantAdminRolePayload = {
    address: workflow.authorizer.address,
    functionName: 'grantRole',
    args: [
      await workflow.authorizer.read.getAdminRole.run(),
      adminMultisig,
    ],
  };

  try {
    const tx4 = await workflow.authorizer.write.grantRole.run(
      grantAdminRolePayload.args
    );

    await targetSdk.publicClient.waitForTransactionReceipt({
      hash: tx4,
    });

    console.info('        > Transaction: ', tx4);

    migrationProtocol.grantAdminRolePayload = {
      grantAdminRolePayload,
      status: 'success',
      hash: tx4,
    };
  } catch (e) {
    console.error('            > Error: ', e.message);
    migrationProtocol.grantAdminRolePayload = {
      grantAdminRolePayload,
      status: 'failure',
      error: e.message,
    };
  }

  return migrationProtocol;
}

export const getNetworkIdString = (chainId) => {
  if (chainId == 11155111) {
    return 'eth_sepolia';
  } else if (chainId == 84532) {
    return 'base_sepolia';
  } else if (chainId == 1101) {
    return 'polygon_zkevm';
  } else if (chainId == 80002) {
    return 'polygon_amoy';
  } else if (chainId == 137) {
    return 'polygon';
  }
};
