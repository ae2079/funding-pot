import {
  createPublicClient,
  http,
  getContract,
  parseUnits,
} from 'viem';
import { AnkrProvider } from '@ankr.com/ankr.js';

import { queryBuilder } from './queryBuilder.js';
import abis from '../../data/abis.js';
import { keysToLowerCase } from '../../utils/helpers.js';

export class Queries {
  indexerUrl;
  chainId;
  publicClient;
  networkIdString;
  ankrProvider;
  bondingCurve;
  queries;
  backendUrl;

  constructor({ rpcUrl, indexerUrl, chainId, backendUrl }) {
    this.backendUrl = backendUrl;
    this.indexerUrl = indexerUrl;
    this.chainId = chainId;
    this.publicClient = createPublicClient({
      chain: chainId,
      transport: http(rpcUrl),
    });
    this.networkIdString = this.getNetworkIdString(rpcUrl);
    this.ankrProvider = new AnkrProvider(
      this.getAdvancedApiEndpoint(rpcUrl)
    );
    this.queries = { addresses: {} };
  }

  async setup(orchestratorAddress) {
    const orchestrator = getContract({
      address: orchestratorAddress,
      client: this.publicClient,
      abi: abis.orchestratorAbi,
    });
    this.queries.addresses.orchestrator = orchestratorAddress;
    this.queries.addresses.bondingCurve =
      await orchestrator.read.fundingManager();
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
  }

  // QUERIES

  async getTimeframe({ configuration, safe }) {
    const timeframe = {};

    if (configuration && configuration.FROM_TIMESTAMP) {
      timeframe.fromTimestamp = configuration.FROM_TIMESTAMP;
    } else {
      timeframe.fromTimestamp = (
        await this.getLastPurchaseBlock(safe)
      ).toString();
    }

    if (configuration && configuration.TO_TIMESTAMP) {
      timeframe.toTimestamp = configuration.TO_TIMESTAMP;
    } else {
      timeframe.toTimestamp = (
        await this.getCurrentBlockNumber()
      ).toString();
    }

    this.queries.timeframe = timeframe;

    return this.queries.timeframe;
  }

  async getLastPurchaseBlock(multisig) {
    const {
      Swap: [lastBuy],
    } = await this.indexerConnector(
      queryBuilder.indexer.lastBuyBlocknumber(multisig, this.chainId)
    );
    return lastBuy.blockTimestamp;
  }

  async getCurrentBlockNumber() {
    const block = await this.publicClient.getBlock();
    this.queries.blockTimestamp = block.timestamp;
    return this.queries.blockTimestamp;
  }

  async getAmountOut(collateralIn) {
    this.queries.amountOut =
      await this.bondingCurve.read.calculatePurchaseReturn([
        collateralIn,
      ]);
    return this.queries.amountOut;
  }

  async getIssuanceSupply() {
    this.queries.issuanceSupply =
      await this.bondingCurve.read.getVirtualIssuanceSupply();
    return this.queries.issuanceSupply;
  }

  async getInflows(token, recipient, fromTimestamp, toTimestamp) {
    const transactions = await this.ankrProvider.getTokenTransfers({
      address: recipient,
      fromTimestamp,
      toTimestamp,
      blockchain: this.networkIdString,
      pageSize: 10000,
    });

    const inflows = transactions.transfers
      .filter(
        (tx) => tx.toAddress.toLowerCase() === recipient.toLowerCase()
      )
      .filter(
        (tx) =>
          tx.contractAddress.toLowerCase() === token.toLowerCase()
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

    this.queries.inflows = inflows;
    return this.queries.inflows;
  }

  async getIssuanceToken() {
    this.queries.issuanceToken =
      await this.bondingCurve.read.getIssuanceToken();
    return this.queries.issuanceToken;
  }

  async getSpotPrice() {
    this.queries.spotPrice =
      await this.bondingCurve.read.getStaticPriceForBuying();
    return this.queries.spotPrice;
  }

  async getBalances() {
    const { LinearVesting: vestings } = await this.indexerConnector(
      queryBuilder.indexer.vestings(
        this.chainId,
        this.queries.addresses.orchestrator
      )
    );

    const vestedBalances = vestings.reduce((acc, vesting) => {
      if (!acc[vesting.recipient]) {
        acc[vesting.recipient] = BigInt(vesting.amountRaw);
      } else {
        acc[vesting.recipient] += BigInt(vesting.amountRaw);
      }
      return acc;
    }, {});

    this.queries.vestedBalances = keysToLowerCase(vestedBalances);
    return this.queries.vestedBalances;
  }

  async getNftHolders(token) {
    const { holders } = await this.ankrProvider.getNFTHolders({
      blockchain: this.networkIdString,
      contractAddress: token,
    });
    this.queries.nftHolders = holders.map((h) => h.toLowerCase());
    return this.queries.nftHolders;
  }

  async getAllowlist() {
    const {
      batchMintingEligibleUsers: { users },
    } = await this.backendConnector(queryBuilder.backend.allowlist());
    return users;
  }

  async getIssuanceTokenFromWrapper() {
    const mintWrapper = getContract({
      address: this.queries.addresses.mintWrapper,
      client: this.publicClient,
      abi: abis.mintWrapperAbi,
    });

    return await mintWrapper.read.issuanceToken();
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

  getNetworkIdString(rpcUrl) {
    const [, , , networkIdString] = rpcUrl.split('/');
    return networkIdString;
  }

  getAdvancedApiEndpoint(rpcUrl) {
    const dissembled = rpcUrl.split('/');
    dissembled[3] = 'multichain';
    const reassembled = dissembled.join('/');
    return reassembled;
  }
}
