import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  toHex,
} from 'viem';
import * as chains from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { SafeFactory } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { ethers } from 'ethers';
import { Inverter, getModule } from '@inverter-network/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getChain = (chainId) => {
  for (const chain of Object.values(chains)) {
    if ('id' in chain) {
      if (chain.id === parseInt(chainId)) {
        return chain;
      }
    }
  }

  throw new Error(`Chain with id ${chainId} not found`);
};

export const mintMockTokens = async (
  token,
  publicClient,
  amount,
  to
) => {
  const walletClient = createWalletClient({
    chainId: process.env.CHAIN_ID,
    transport: http(process.env.RPC_URL),
    account: privateKeyToAccount(process.env.PK),
  });

  const tokenInstance = getContract({
    address: token,
    client: walletClient,
    abi: [
      {
        type: 'function',
        name: 'mint',
        inputs: [
          {
            name: 'to',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
    ],
  });

  const hash = await tokenInstance.write.mint([to, amount]);
  console.info(`Minting ${amount} tokens (${token}) to ${to}...`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.info('✅ Tokens minted');
};

export const deployTestSafe = async () => {
  const wallet = new ethers.Wallet(process.env.PK);
  const ownerAccount = privateKeyToAccount(process.env.PK);
  const delegateAccount = privateKeyToAccount(process.env.DELEGATE);

  const safeFactory = await SafeFactory.init({
    provider: process.env.RPC_URL,
    signer: process.env.PK,
  });

  const safeAccountConfig = {
    owners: [ownerAccount.address],
    threshold: 1,
  };

  console.info('> Deploying Safe...');

  const protocolKit = await safeFactory.deploySafe({
    safeAccountConfig,
    saltNonce: toHex(Date.now()),
  });

  const safeAddress = await protocolKit.getAddress();

  console.info('✅ Safe deployed at:', safeAddress);

  const apiKit = new SafeApiKit.default({
    chainId: process.env.CHAIN_ID,
  });

  console.info(
    `> Adding delegate ${delegateAccount.address} to safe ${safeAddress}...`
  );

  await apiKit.addSafeDelegate({
    delegateAddress: delegateAccount.address,
    delegatorAddress: ownerAccount.address,
    safeAddress: safeAddress,
    signer: wallet,
    label: 'round-proposer',
  });

  console.info('✅ Delegate added');

  return safeAddress;
};

export const deployWorkflow = async (safeAddress) => {
  const mockCollateralToken =
    '0xC4d4598AE5843ed851D81F4E35E97cCCC4E25D80';
  const publicClient = createPublicClient({
    chain: getChain(process.env.CHAIN_ID),
    transport: http(process.env.RPC_URL),
  });

  const walletClient = createWalletClient({
    chain: getChain(process.env.CHAIN_ID),
    transport: http(process.env.RPC_URL),
    account: privateKeyToAccount(process.env.PK),
  });

  const inverterSdk = new Inverter({ publicClient, walletClient });

  console.info('> Deploying issuance token...');
  // deploy issuance token
  const issuanceToken = await inverterSdk.deploy('ERC20Issuance', {
    name: 'My Token',
    symbol: 'MT',
    decimals: 18,
    maxSupply: '1000000',
    initialAdmin: walletClient.account.address,
  });

  console.info(
    '✅ Issuance token deployed at: ',
    issuanceToken.tokenAddress
  );

  const requestedModules = {
    fundingManager:
      'FM_BC_Restricted_Bancor_Redeeming_VirtualSupply_v1',
    paymentProcessor: 'PP_Streaming_v1',
    authorizer: 'AUT_Roles_v1',
    optionalModules: ['LM_PC_PaymentRouter_v1'],
  };

  const { run } = await inverterSdk.getDeploy({
    requestedModules,
  });

  console.info('> Deploying workflow...');

  const args = {
    orchestrator: {
      independentUpdates: false,
      independentUpdateAdmin:
        '0x0000000000000000000000000000000000000000',
    },
    authorizer: { initialAdmin: walletClient.account.address },
    fundingManager: {
      issuanceToken: issuanceToken.tokenAddress,
      bondingCurveParams: {
        formula: '0xfaf6c989dB0582D7b31e40343dd4A41a1848E038',
        buyFee: '50',
        sellFee: '50',
        reserveRatioForBuying: 333_333,
        reserveRatioForSelling: 333_333,
        buyIsOpen: true,
        sellIsOpen: true,
        initialIssuanceSupply: '200002.999999999999998676',
        initialCollateralSupply: '296.306333665498798599',
      },
      collateralToken: mockCollateralToken,
    },
  };
  const { orchestratorAddress, transactionHash: tx1 } = await run(
    args
  );
  await publicClient.waitForTransactionReceipt({
    hash: tx1,
  });
  console.info('✅ Workflow deployed at: ', orchestratorAddress);

  console.info('> Setting minter...');
  const workflow = await inverterSdk.getWorkflow({
    orchestratorAddress,
    requestedModules,
  });
  const issuanceTokenModule = getModule({
    name: 'ERC20Issuance_v1',
    address: issuanceToken.tokenAddress,
    publicClient: publicClient,
    walletClient: walletClient,
    extras: {
      decimals: 18,
      walletAddress: walletClient.address,
      defaultToken: mockCollateralToken,
    },
  });
  const bondingCurveAddress = await workflow.fundingManager.address;
  const tx2 = await issuanceTokenModule.write.setMinter.run([
    bondingCurveAddress,
    true,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.info('✅ Minter set');

  console.info('> Assigning curve interaction role...');
  const curveInteractionRole =
    await workflow.fundingManager.read.CURVE_INTERACTION_ROLE.run();
  const tx3 = await workflow.fundingManager.write.grantModuleRole.run(
    [curveInteractionRole, safeAddress]
  );
  await publicClient.waitForTransactionReceipt({ hash: tx3 });
  console.info('✅ Curve interaction role assigned');

  console.info('> Assigning payment pusher role...');
  const paymentPusherRole =
    await workflow.optionalModule.LM_PC_PaymentRouter_v1.read.PAYMENT_PUSHER_ROLE.run();
  const tx4 =
    await workflow.optionalModule.LM_PC_PaymentRouter_v1.write.grantModuleRole.run(
      [paymentPusherRole, safeAddress]
    );
  await publicClient.waitForTransactionReceipt({ hash: tx4 });
  console.info('✅ Payment pusher role assigned');

  return orchestratorAddress;
};

export const setupForE2E = async () => {
  const filePath = path.join(
    __dirname,
    '../data/test/input/projects.json'
  );

  try {
    const projectsConfig = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, `../data/test/input/projects.json`)
      )
    );
    if (projectsConfig && projectsConfig.TESTPROJECT) {
      console.info('✅ Project config already exists');
      return projectsConfig.TESTPROJECT;
    } else {
      console.info(
        'No project config found, setting up new e2e environment...'
      );

      const safeAddress = await deployTestSafe();
      const orchestratorAddress = await deployWorkflow(safeAddress);

      fs.writeFileSync(
        filePath,
        JSON.stringify({
          TESTPROJECT: {
            SAFE: safeAddress,
            ORCHESTRATOR: orchestratorAddress,
          },
        }),
        'utf8'
      );
    }
  } catch (e) {
    console.log(e);
  }

  return getTestProjectConfig();
};

export const getTestProjectConfig = async () => {
  const filePath = path.join(
    __dirname,
    '../data/test/input/projects.json'
  );

  const projectsConfig = JSON.parse(fs.readFileSync(filePath));

  return projectsConfig.TESTPROJECT;
};
// export const signAndExecuteSafeTx = async () => {};
