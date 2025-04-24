import {
  createPublicClient,
  http,
  getContract,
  parseUnits,
  getAddress,
} from 'viem';
import { AnkrProvider } from '@ankr.com/ankr.js';
import axios from 'axios';

import { queryBuilder } from './queryBuilder.js';
import abis from '../../data/abis.js';
import { isNativeToken, isAxelarRelay } from '../../utils/helpers.js';
import { SQUID_MULTICALL } from '../../config.js';

export class Queries {
  indexerUrl;
  chainId;
  publicClient;
  networkIdString;
  ankrProvider;
  bondingCurve;
  queries;
  backendUrl;

  constructor({
    rpcUrl,
    indexerUrl,
    chainId,
    backendUrl,
    advancedApiKey,
  }) {
    this.backendUrl = backendUrl;
    this.indexerUrl = indexerUrl;
    this.chainId = chainId;

    this.publicClient = createPublicClient({
      chain: chainId,
      transport: http(rpcUrl),
    });
    this.networkIdString = this.getNetworkIdString(chainId);
    this.ankrProvider = new AnkrProvider(
      this.getAdvancedApiEndpoint(advancedApiKey)
    );
    this.queries = { addresses: {} };
    this.errors = [];
  }

  async setup(orchestratorAddress) {
    const timerKey = '  ⏱️ Getting relevant addresses (RPC)';
    console.time(timerKey);

    const orchestrator = getContract({
      address: orchestratorAddress,
      client: this.publicClient,
      abi: abis.orchestratorAbi,
    });
    this.queries.addresses.orchestrator = orchestratorAddress;
    this.queries.addresses.bondingCurve =
      await orchestrator.read.fundingManager();
    this.queries.addresses.authorizer =
      await orchestrator.read.authorizer();
    this.queries.addresses.paymentProcessor =
      await orchestrator.read.paymentProcessor();
    this.bondingCurve = getContract({
      address: this.queries.addresses.bondingCurve,
      client: this.publicClient,
      abi: abis.bondingCurveAbi,
    });
    this.queries.addresses.collateralToken =
      await this.bondingCurve.read.token();
    this.queries.addresses.mintWrapper =
      await this.bondingCurve.read.getIssuanceToken();
    this.queries.addresses.issuanceToken =
      await this.getIssuanceTokenFromWrapper();
    const modules = await orchestrator.read.listModules();
    for (const module of modules) {
      const moduleContract = getContract({
        address: module,
        client: this.publicClient,
        abi: abis.bondingCurveAbi,
      });
      const moduleName = await moduleContract.read.title();
      if (moduleName === 'LM_PC_PaymentRouter_v1') {
        this.queries.addresses.paymentRouter = module;
      }
    }

    console.timeEnd(timerKey);
  }

  // QUERIES
  async getFirstAdmin() {
    const authorizer = getContract({
      address: this.queries.addresses.authorizer,
      client: this.publicClient,
      abi: abis.authorizerAbi,
    });

    const firstAdmin = await authorizer.read.getRoleMember([
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      0,
    ]);

    return firstAdmin;
  }

  async adminCount() {
    const authorizer = getContract({
      address: this.queries.addresses.authorizer,
      client: this.publicClient,
      abi: abis.authorizerAbi,
    });

    const adminCount = await authorizer.read.getRoleMemberCount([
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);

    return adminCount;
  }

  async getTimeframe({ configuration }) {
    const timeframe = {};
    timeframe.fromTimestamp = configuration.FROM_TIMESTAMP;
    timeframe.toTimestamp = configuration.TO_TIMESTAMP;
    this.queries.timeframe = timeframe;

    return this.queries.timeframe;
  }

  async getCurrentBlockNumber() {
    const block = await this.publicClient.getBlock();
    this.queries.blockTimestamp = block.timestamp;
    return this.queries.blockTimestamp;
  }

  async getAmountOut(collateralIn) {
    const timerKey = '  ⏱️ Getting purchase amount (RPC)';
    console.time(timerKey);

    this.queries.amountOut =
      await this.bondingCurve.read.calculatePurchaseReturn([
        collateralIn,
      ]);
    console.timeEnd(timerKey);
    return this.queries.amountOut;
  }

  async getIssuanceSupply() {
    const timerKey = '  ⏱️ Getting issuance supply (RPC)';
    console.time(timerKey);

    this.queries.issuanceSupply =
      await this.bondingCurve.read.getVirtualIssuanceSupply();
    console.timeEnd(timerKey);

    return this.queries.issuanceSupply;
  }

  async getInflows(token, recipient, fromTimestamp, toTimestamp) {
    const timerKey = '  ⏱️ Getting inflows (ANKR API)';
    console.time(timerKey);

    let data;
    let inflows;

    let attempts = 0;
    for (let i = 0; i < 10; i++) {
      try {
        if (isNativeToken(token)) {
          inflows = await this.getDirectNativeTransfers(
            recipient,
            fromTimestamp,
            toTimestamp
          );

          inflows = [
            ...inflows,
            ...(await this.getSquidTransfers(
              recipient,
              fromTimestamp,
              toTimestamp,
              inflows.map((i) => i.transactionHash)
            )),
          ];
        } else {
          data = await this.ankrProvider.getTokenTransfers({
            address: recipient,
            fromTimestamp,
            toTimestamp,
            blockchain: this.networkIdString,
            pageSize: 10000,
          });

          inflows = data
            .filter(
              (tx) =>
                tx.toAddress.toLowerCase() === recipient.toLowerCase()
            )
            .filter(
              (tx) =>
                tx.contractAddress.toLowerCase() ===
                token.toLowerCase()
            )
            .map((tx) => {
              const {
                fromAddress,
                value,
                tokenDecimals,
                timestamp,
                transactionHash,
              } = tx;
              return {
                participant: fromAddress.toLowerCase(),
                contribution: parseUnits(value, tokenDecimals),
                timestamp,
                transactionHash,
              };
            })
            .sort((a, b) => a.timestamp - b.timestamp);
        }
        break;
      } catch (e) {
        console.error(e);
      }
    }

    this.queries.inflows = inflows;

    console.timeEnd(timerKey);
    return this.queries.inflows;
  }

  async getIssuanceToken() {
    const timerKey = '  ⏱️ Getting issuance token (RPC)';
    console.time(timerKey);
    this.queries.issuanceToken =
      await this.bondingCurve.read.getIssuanceToken();
    console.timeEnd(timerKey);
    return this.queries.issuanceToken;
  }

  async getSpotPrice() {
    const timerKey = '  ⏱️ Getting spot price (RPC)';
    console.time(timerKey);
    this.queries.spotPrice =
      await this.bondingCurve.read.getStaticPriceForBuying();
    console.timeEnd(timerKey);
    return this.queries.spotPrice;
  }

  async getDirectNativeTransfers(
    recipient,
    fromTimestamp,
    toTimestamp
  ) {
    for (let i = 0; i < 10; i++) {
      try {
        const response =
          await this.ankrProvider.getTransactionsByAddress({
            address: recipient,
            fromTimestamp,
            toTimestamp,
            blockchain: this.networkIdString,
            pageSize: 10000,
          });
        const data = response.transactions;
        const inflows = data
          .filter(
            (tx) => tx.to.toLowerCase() === recipient.toLowerCase()
          )
          .map((tx) => {
            return {
              participant: tx.from.toLowerCase(),
              contribution: BigInt(tx.value),
              timestamp: BigInt(tx.timestamp),
              transactionHash: tx.hash,
            };
          });

        return inflows;
      } catch (e) {
        if (e.data.includes('context deadline exceeded')) {
          console.error('  ❌ Ankr API error, retrying...');
        } else {
          throw e;
        }
      }
    }
  }

  async getSquidTransfers(
    recipient,
    fromTimestamp,
    toTimestamp,
    excludeHashes
  ) {
    let logs;
    for (let i = 0; i < 10; i++) {
      try {
        ({ logs } = await this.ankrProvider.getLogs({
          address: recipient,
          fromTimestamp,
          toTimestamp,
          blockchain: this.networkIdString,
          pageSize: 100,
          decodeLogs: true,
          topics: [
            '0x3d0ce9bfc3ed7d6862dbb28b2dea94561fe714a1b4d019aa8af39730d1ad7c3d',
          ],
        }));
      } catch (e) {
        if (e.data.includes('context deadline exceeded')) {
          console.error('  ❌ Ankr API error, retrying...');
        } else {
          throw e;
        }
      }
    }

    const filteredLogs = logs.filter(
      (l) => !excludeHashes.includes(l.transactionHash)
    );

    const inflows = [];
    for (const log of filteredLogs) {
      const [sender] = log.event.inputs;
      if (
        sender.valueDecoded.toLowerCase() ===
        SQUID_MULTICALL.toLowerCase()
      ) {
        const actualSender = await this.lookupTransaction(
          log.transactionHash
        );
        inflows.push({
          participant: actualSender,
          contribution: BigInt(log.event.inputs[1].valueDecoded),
          timestamp: BigInt(log.timestamp),
          transactionHash: log.transactionHash,
        });
      }
    }

    return inflows;
  }

  async getNftHolders(token) {
    let holders;

    const timerKey = '  ⏱️ Getting NFT holders (ANKR API)';
    console.time(timerKey);

    let attempts = 0;
    for (let i = 0; i < 10; i++) {
      try {
        const x = await this.ankrProvider.getNFTHolders({
          blockchain: this.networkIdString,
          contractAddress: getAddress(token),
        });
        ({ holders } = x);
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

    this.queries.nftHolders = holders.map((h) => h.toLowerCase());
    console.timeEnd(timerKey);
    return this.queries.nftHolders;
  }

  async getNftHoldersForInflows(token, inflows) {
    const timerKey = '  ⏱️ Getting NFT holders (RPC)';
    console.time(timerKey);
    const candidates = inflows.map((i) => i.participant);
    const holders = [];

    const nftContract = getContract({
      address: token,
      client: this.publicClient,
      abi: abis.nftAbi,
    });

    for (const candidate of candidates) {
      const balance = await nftContract.read.balanceOf([candidate]);
      if (balance > 0) {
        holders.push(candidate);
      }
    }
    console.timeEnd(timerKey);
    this.queries.nftHolders = [...new Set(holders)];
    return this.queries.nftHolders;
  }

  async getAllowlist() {
    const timerKey = '  ⏱️ Getting allowlist (QACC API)';
    console.time(timerKey);

    const {
      batchMintingEligibleUsers: { users },
    } = await this.backendConnector(queryBuilder.backend.allowlist());
    console.timeEnd(timerKey);
    return users;
  }

  async getAllowlists() {
    const timerKey = '  ⏱️ Getting allowlists (QACC API)';
    console.time(timerKey);
    const {
      batchMintingEligibleUsersV2: { users },
    } = await this.backendConnector(
      queryBuilder.backend.allowlists()
    );
    console.timeEnd(timerKey);

    const privadoAllowlist = [];
    const gitcoinAllowlist = [];

    for (const user of users) {
      if (user.kycType === 'zkId') {
        privadoAllowlist.push(user.address);
      } else if (user.kycType === 'GTCPass') {
        gitcoinAllowlist.push(user.address);
      }
    }

    this.queries.allowlists = {
      privadoAllowlist,
      gitcoinAllowlist,
    };

    return this.queries.allowlists;
  }

  async getIssuanceTokenFromWrapper() {
    const mintWrapper = getContract({
      address: this.queries.addresses.mintWrapper,
      client: this.publicClient,
      abi: abis.mintWrapperAbi,
    });

    try {
      return await mintWrapper.read.issuanceToken();
    } catch (e) {
      return this.queries.addresses.mintWrapper;
    }
  }

  async balanceOf(token, address) {
    const tokenContract = getContract({
      address: token,
      client: this.publicClient,
      abi: abis.erc20Abi,
    });
    return await tokenContract.read.balanceOf([address]);
  }

  async feesCollected() {
    const fundingManager = getContract({
      address: this.queries.addresses.bondingCurve,
      client: this.publicClient,
      abi: abis.bondingCurveAbi,
    });
    return await fundingManager.read.projectCollateralFeeCollected();
  }

  async lookupTransaction(txHash) {
    let error = `API Error looking up transaction ${txHash}`;

    if (!txHash?.startsWith('0x')) {
      throw new Error('Transaction hash must start with 0x');
    }

    // Move to config/constants
    const AXELAR_API = 'https://api.axelarscan.io/gmp/searchGMP';
    const SQUID_API = 'https://apiplus.squidrouter.com/v2/rfq/order';

    // Try Axelar
    try {
      const axelarResponse = await axios.post(
        AXELAR_API,
        { size: 1, txHash },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const from =
        axelarResponse.data?.data?.[0]?.call?.receipt?.from;
      if (from) {
        console.log(`Transaction found in Axelar: ${from}`);
        return from;
      }
    } catch (error) {
      console.error(`Axelar API error for ${txHash}:`, error.message);
    }

    // Try Squid
    try {
      const squidResponse = await axios.post(
        SQUID_API,
        { hash: txHash },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-integrator-id': process.env.SQUID_INTEGRATOR_ID,
          },
        }
      );

      const from = squidResponse.data?.fromAddress;
      if (from) {
        console.log(`Transaction found in Squid: ${from}`);
        return from;
      }
    } catch (error) {
      console.error(`Squid API error for ${txHash}:`, error.message);
    }

    for (let i = 0; i < 10; i++) {
      try {
        const { transactions } =
          await this.ankrProvider.getTransactionsByHash({
            transactionHash: txHash,
            blockchain: this.networkIdString,
          });
        console.log(
          `Transaction found in Ankr: ${transactions[0].from}`
        );
        return transactions[0].from;
      } catch (error) {
        if (error.data.includes('context deadline exceeded')) {
          console.error('  ❌ Ankr API error, retrying...');
        } else {
          console.error(error);
          break;
        }
      }
    }

    this.errors.push(error);

    throw new Error(
      `Could not resolve transaction ${txHash} from any source`
    );
  }

  /* 
    CONNECTORS
  */

  async getGraphQLConnector(url) {
    const connector = async (query) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
        }),
      });

      const { data } = await response.json();
      return data;
    };

    return connector;
  }

  async indexerConnector(query) {
    const connector = await this.getGraphQLConnector(this.indexerUrl);
    const data = await connector(query);
    return data;
  }

  async backendConnector(query) {
    const connector = await this.getGraphQLConnector(this.backendUrl);
    const data = await connector(query);
    return data;
  }

  /*
    UTILS
  */

  getNetworkIdString(chainId) {
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
  }

  getAdvancedApiEndpoint(apiKey) {
    return `https://rpc.ankr.com/multichain/${apiKey}`;
  }
}
