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
  indexerUrlenv;
  publicClient;
  ankrProvider;
  networkIdString;

  constructor({ rpcUrl, indexerUrl, chainId }) {
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
    this.queries.addresses.issuanceToken =
      await this.bondingCurve.read.getIssuanceToken();

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

  // TODO: test what happens with predefined timeframe
  async getTimeframe({ fromTimestamp, toTimestamp, address }) {
    if (!fromTimestamp && fromTimestamp !== 0) {
      fromTimestamp = await this.getLastPurchaseBlock(address);
    }
    if (!toTimestamp) {
      toTimestamp = await this.getCurrentBlockNumber();
    }
    this.queries.timeframe = {
      fromTimestamp: parseInt(fromTimestamp),
      toTimestamp: parseInt(toTimestamp),
    };
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
    console.log({
      address: recipient,
      fromTimestamp,
      toTimestamp,
      blockchain: this.networkIdString,
      pageSize: 10000,
    });
    const transactions = await this.ankrProvider.getTokenTransfers({
      address: recipient,
      fromTimestamp,
      toTimestamp,
      blockchain: this.networkIdString,
      pageSize: 10000,
    });

    console.log('transactions: ', transactions);

    const inflows = transactions.transfers
      .filter(
        (tx) => tx.toAddress.toLowerCase() === recipient.toLowerCase()
      )
      .filter(
        (tx) =>
          tx.contractAddress.toLowerCase() === token.toLowerCase()
      )
      .reduce((acc, tx) => {
        console.log(acc);
        const { fromAddress, value, tokenDecimals } = tx;
        if (!acc[fromAddress]) {
          acc[fromAddress] = {
            contribution: parseUnits(value, tokenDecimals),
          };
        } else {
          acc[fromAddress].contribution += parseUnits(
            value,
            tokenDecimals
          );
        }
        return acc;
      }, {});

    this.queries.inflows = keysToLowerCase(inflows);
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

  /* 
    CONNECTORS
  */

  async indexerConnector(query) {
    const response = await fetch(this.indexerUrl, {
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
