import {
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
} from 'viem';
import { encodeSingle, TransactionType } from 'ethers-multisend';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { config } from './config.js';
import { abis } from './abis.js';

class FeeDistributorTransactionBuilder {
  constructor(chainConfig) {
    this.transactions = [];
    this.safe = chainConfig.feeCollectorMs; // Updated to use feeCollectorMs
    this.chainId = chainConfig.chainId; // Used for the output JSON
    this.batchSize = chainConfig.batchSize;
    // this.outputDirectory = chainConfig.outputDirectory; // Removed
    this.transactionMeta = chainConfig.transactionMeta;
  }

  addTokenTransfer(tokenAddress, recipientAddress, amountBigInt) {
    this.transactions.push({
      to: tokenAddress,
      value: '0',
      // data will be encoded later using encodeSingle
      contractMethod: {
        // For readable output
        name: 'transfer',
        inputs: [
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
      contractInputsValues: {
        // For readable output
        recipient: recipientAddress,
        amount: amountBigInt.toString(),
      },
      // Store raw values for encoding
      _rawTxDetails: {
        abi: abis.erc20,
        functionSignature: 'transfer(address,uint256)',
        inputValues: [recipientAddress, amountBigInt],
      },
    });
  }

  addNativeTransfer(recipientAddress, amountBigInt) {
    this.transactions.push({
      to: recipientAddress,
      value: amountBigInt.toString(),
      _isNativeTransfer: true, // Marker for native transfer
      contractMethod: {
        // For readable output
        name: 'Native Transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
      },
      contractInputsValues: {
        // For readable output
        to: recipientAddress,
        value: amountBigInt.toString(),
      },
    });
  }

  getEncodedTxs() {
    const encodedTxs = [];
    for (const tx of this.transactions) {
      if (tx._isNativeTransfer) {
        encodedTxs.push({
          to: tx.to,
          value: tx.value, // Already a string from amountBigInt.toString()
          data: '0x', // Native transfers have "0x" data
          contractMethod: tx.contractMethod,
          contractInputsValues: tx.contractInputsValues,
        });
      } else {
        // Existing ERC20 logic
        const encoded = encodeSingle({
          type: TransactionType.callContract,
          id: '0',
          to: tx.to,
          value: tx.value, // This is '0' for ERC20 transfers
          abi: tx._rawTxDetails.abi,
          functionSignature: tx._rawTxDetails.functionSignature,
          inputValues: tx._rawTxDetails.inputValues,
        });
        encodedTxs.push({
          ...encoded,
          value: encoded.value === '0x00' ? '0' : encoded.value,
          contractMethod: tx.contractMethod,
          contractInputsValues: tx.contractInputsValues,
        });
      }
    }
    return encodedTxs;
  }

  getTxBatches(txs) {
    const txBatch = [];
    for (let i = 0; i < txs.length; i += this.batchSize) {
      const chunk = txs.slice(i, i + this.batchSize);
      txBatch.push(chunk);
    }
    return txBatch;
  }

  getTransactionJsons() {
    const allEncodedTxs = this.getEncodedTxs();
    const encodedTxBatches = this.getTxBatches(allEncodedTxs);
    const transactionJsons = [];
    const runTimestamp = Date.now(); // Timestamp for the entire run

    for (let i = 0; i < encodedTxBatches.length; i++) {
      const batch = encodedTxBatches[i];
      transactionJsons.push({
        version: '1.0',
        chainId: (process.env.CHAIN_ID || this.chainId).toString(),
        createdAt: runTimestamp, // Use runTimestamp for internal consistency
        meta: {
          name: `[${this.transactionMeta.namePrefix
            .toUpperCase()
            .replace(/\s+/g, '_')}]-${runTimestamp}`, // Base name with timestamp
          description: this.transactionMeta.description,
          txBuilderVersion: 'fee-distributor-v1',
          createdFromSafeAddress: this.safe,
          createdFromOwnerAddress: '', // Optional: Can be filled by user
          checksum: '', // Optional: Gnosis Safe UI calculates this
        },
        transactions: batch.map((tx) => ({
          to: tx.to,
          value: tx.value,
          data: tx.data,
          contractMethod: tx.contractMethod, // For readability
          contractInputsValues: tx.contractInputsValues, // For readability
        })),
      });
    }
    return transactionJsons;
  }

  saveTransactionJsons(transactionJsons) {
    if (!transactionJsons || transactionJsons.length === 0) {
      console.log('No transactions to save.');
      return;
    }
    try {
      const dirPath = path.join(
        'data',
        process.env.NODE_ENV || 'development',
        'transactions'
      );
      mkdirSync(dirPath, { recursive: true });
      transactionJsons.forEach((transactionJson, index) => {
        const baseName = transactionJson.meta.name;
        const fileName =
          transactionJsons.length > 1
            ? `${baseName}-${index + 1}.json`
            : `${baseName}.json`;
        const filePath = path.join(dirPath, fileName);
        writeFileSync(
          filePath,
          JSON.stringify(transactionJson, null, 2),
          'utf8'
        );
        console.log(`💾 Saved transaction batch to ${filePath}`);
      }); // Fixed: Added closing ); for forEach
    } catch (error) {
      console.error('Error saving transaction JSONs:', error);
    }
  }
}

async function main() {
  console.log('🚀 Starting fee distribution script...');

  // Initialize Viem client
  // Note: This will not work correctly until RPC URL and Chain ID are valid in config.js
  let publicClient;
  try {
    if (
      config.rpcUrl !== 'YOUR_RPC_PROVIDER_URL_PLACEHOLDER' &&
      config.chainId !== 'YOUR_CHAIN_ID_PLACEHOLDER'
    ) {
      publicClient = createPublicClient({
        chain: { id: parseInt(config.chainId, 10), name: 'custom' }, // Basic chain definition
        transport: http(config.rpcUrl),
      });
      console.log('Viem public client initialized.');
    } else {
      console.warn(
        '⚠️ Placeholder RPC URL or Chain ID detected. Blockchain interactions will be skipped.'
      );
      console.warn(
        'Please update config.js with valid rpcUrl and chainId to fetch live data.'
      );
    }
  } catch (error) {
    console.error('Failed to initialize Viem public client:', error);
    console.warn(
      'Proceeding without blockchain interactions. Output JSON will not reflect live balances.'
    );
    publicClient = null; // Ensure it's null if initialization fails
  }

  const transactionBuilder = new FeeDistributorTransactionBuilder(
    config
  );

  for (const tokenAddress of config.tokens) {
    // Changed: iterate over tokenAddress strings
    console.log(
      `\nProcessing token: ${tokenAddress}` // Changed: log address
    );
    let tokenDecimals = 18; // Default to 18 if not fetchable
    let tokenBalance = 0n; // Use BigInt for balances
    let tokenSymbol = tokenAddress; // Fallback symbol is address

    if (publicClient) {
      try {
        // Attempt to fetch symbol for better logging
        try {
          const fetchedSymbol = await publicClient.readContract({
            address: tokenAddress,
            abi: abis.erc20,
            functionName: 'symbol',
          });
          if (fetchedSymbol) tokenSymbol = fetchedSymbol;
        } catch (e) {
          console.warn(
            `   Could not fetch symbol for ${tokenAddress}, using address as identifier.`
          );
        }

        tokenDecimals = await publicClient.readContract({
          address: tokenAddress, // Changed: use tokenAddress
          abi: abis.erc20,
          functionName: 'decimals',
        });
        console.log(
          `   Fetched decimals for ${tokenSymbol}: ${tokenDecimals}`
        );

        tokenBalance = await publicClient.readContract({
          address: tokenAddress, // Changed: use tokenAddress
          abi: abis.erc20,
          functionName: 'balanceOf',
          args: [config.feeCollectorMs], // Updated to use feeCollectorMs
        });
        console.log(
          `   Balance in multisig (${
            config.feeCollectorMs // Updated to use feeCollectorMs
          }): ${formatUnits(
            tokenBalance,
            tokenDecimals
          )} ${tokenSymbol}` // Changed: use tokenSymbol
        );
      } catch (error) {
        console.error(
          `   Error fetching data for token ${tokenSymbol}:`, // Changed: use tokenSymbol
          error.message
        );
        console.warn(
          `   Skipping distribution for ${tokenSymbol} due to error. Using 0 balance.` // Changed: use tokenSymbol
        );
        tokenBalance = 0n; // Reset balance on error
      }
    } else {
      console.log(
        `   Skipping blockchain data fetch for ${tokenSymbol} (client not initialized). Assuming 0 balance.` // Changed: use tokenSymbol
      );
      tokenBalance = 0n;
    }

    if (tokenBalance > 0n) {
      for (const recipient of config.recipients) {
        const shareScaled = BigInt(
          Math.round(recipient.share * 10000)
        );
        const amountBigInt = (tokenBalance * shareScaled) / 10000n;

        if (amountBigInt > 0n) {
          console.log(
            `   Queueing transfer of ${formatUnits(
              amountBigInt,
              tokenDecimals
            )} ${tokenSymbol} to ${recipient.name} (${
              // Changed: use tokenSymbol
              recipient.address
            })`
          );
          transactionBuilder.addTokenTransfer(
            tokenAddress, // Changed: use tokenAddress
            recipient.address,
            amountBigInt
          );
        } else {
          console.log(
            `   Calculated amount for ${recipient.name} is 0. Skipping.`
          );
        }
      }
    } else {
      console.log(
        `   No balance of ${tokenSymbol} in multisig, or error fetching balance. Skipping distribution for this token.` // Changed: use tokenSymbol
      );
    }
  }

  // Native Token Distribution Logic
  if (config.distributeNativeToken && publicClient) {
    console.log(
      `\nProcessing native token: ${config.nativeTokenSymbol}`
    );
    try {
      const nativeBalance = await publicClient.getBalance({
        address: config.feeCollectorMs,
      });
      console.log(
        `   Balance of ${config.nativeTokenSymbol} in multisig (${
          config.feeCollectorMs
        }): ${formatUnits(nativeBalance, 18)}` // Native tokens usually have 18 decimals
      );

      if (nativeBalance > 0n) {
        for (const recipient of config.recipients) {
          const shareScaled = BigInt(
            Math.round(recipient.share * 10000)
          );
          const amountBigInt = (nativeBalance * shareScaled) / 10000n;

          if (amountBigInt > 0n) {
            console.log(
              `   Queueing transfer of ${formatUnits(
                amountBigInt,
                18
              )} ${config.nativeTokenSymbol} to ${recipient.name} (${
                recipient.address
              })`
            );
            transactionBuilder.addNativeTransfer(
              recipient.address,
              amountBigInt
            );
          } else {
            console.log(
              `   Calculated native token amount for ${recipient.name} is 0. Skipping.`
            );
          }
        }
      } else {
        console.log(
          `   No native token balance (${config.nativeTokenSymbol}) in multisig. Skipping native distribution.`
        );
      }
    } catch (error) {
      console.error(
        `   Error fetching native token (${config.nativeTokenSymbol}) balance:`,
        error.message
      );
      console.warn(
        `   Skipping native token distribution due to error.`
      );
    }
  } else if (config.distributeNativeToken && !publicClient) {
    console.warn(
      `\n⚠️ Native token distribution is enabled, but client is not initialized. Skipping native token processing.`
    );
  }

  if (transactionBuilder.transactions.length > 0) {
    console.log('\nGenerating Gnosis Safe transaction JSONs...');
    const transactionJsons = transactionBuilder.getTransactionJsons();
    transactionBuilder.saveTransactionJsons(transactionJsons);
  } else {
    console.log('\nNo transactions were queued. Nothing to save.');
  }

  console.log('\n✅ Fee distribution script finished.');
}

main().catch((error) => {
  console.error('Unhandled error in main execution:', error);
});
