import { createWalletClient, http, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const mintMockTokens = async (
  token,
  publicClient,
  amount,
  to
) => {
  const walletClient = createWalletClient({
    chainId: process.env.CHAIN_ID,
    transport: http(process.env.RPC_URL),
    account: privateKeyToAccount('0x' + process.env.PK),
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
  console.log(`Minting ${amount} tokens (${token}) to ${to}`);
  await publicClient.waitForTransactionReceipt({ hash });
};
