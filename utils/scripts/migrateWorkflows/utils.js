import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonZkEvm, baseSepolia } from 'viem/chains';
import { Inverter } from '@inverter-network/sdk';
import { AnkrProvider } from '@ankr.com/ankr.js';

import { getChain } from '../../../utils/testUtils/testHelpers.js';
import abis from '../../../data/abis.js';
import { requestedModules } from '../../../utils/testUtils/staticTestData.js';

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
    console.log(
      `Loaded output data for project ${projectName}:`,
      outputData
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

  console.log(process.env.PK);

  const account = privateKeyToAccount(process.env.PK);

  console.log('account: ', account);

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
    totalIssuanceSupply,
    tokenSnapshot,
  };

  return state;
}

export async function mintTokens(state, tokenToWrapper) {
  const { publicClient, walletClient } = createClients('target');

  const wrapper = tokenToWrapper[state.issuanceToken];

  if (!wrapper) {
    console.log('No wrapper found for token', state.issuanceToken);
    return;
  }

  for (const entry of state.tokenSnapshot) {
    const { holderAddress, balanceRawInteger } = entry;
    if (balanceRawInteger === 0n) continue;

    console.log(
      `Minting ${balanceRawInteger} tokens for ${holderAddress}`
    );

    // const mintWrapperContract = getContract({
    //   address: wrapper,
    //   client: walletClient,
    //   abi: abis.mintWrapperAbi,
    // });

    // console.log([holderAddress, balanceRawInteger]);
    // const hash = await mintWrapperContract.write.mint([
    //   holderAddress,
    //   balanceRawInteger,
    // ]);

    const hash = await walletClient.writeContract({
      address: wrapper,
      abi: abis.mintWrapperAbi,
      functionName: 'mint',
      args: [holderAddress, balanceRawInteger],
    });

    console.log('Mint transaction:', hash);

    // Wait for transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash });
  }
}
