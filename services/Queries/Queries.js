import {
  createPublicClient,
  http,
  getContract,
  parseUnits,
} from 'viem';
import { AnkrProvider } from '@ankr.com/ankr.js';

import { queryBuilder } from './queryBuilder.js';
import abis from '../../data/abis.js';

export class Queries {
  indexerUrl;
  publicClient;
  ankrProvider;
  networkIdString;
  sdk;

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
    this.addresses = {};
  }

  async setup(orchestratorAddress) {
    const orchestrator = getContract({
      address: orchestratorAddress,
      client: this.publicClient,
      abi: abis.orchestratorAbi,
    });
    this.addresses.orchestrator = orchestratorAddress;
    this.addresses.bondingCurve =
      await orchestrator.read.fundingManager();
    this.bondingCurve = getContract({
      address: this.addresses.bondingCurve,
      client: this.publicClient,
      abi: abis.bondingCurveAbi,
    });
    this.addresses.collateralToken =
      await this.bondingCurve.read.token();
    this.addresses.issuanceToken =
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
        this.addresses.paymentRouter = module;
      }
    }
  }

  // QUERIES

  async getTimeframe({ startBlock, endBlock, address }) {
    if (!startBlock && startBlock !== 0) {
      startBlock = await this.getLastPurchaseBlock(address);
    }
    if (!endBlock) {
      endBlock = await this.getCurrentBlockNumber();
    }

    return {
      startBlock,
      endBlock,
    };
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
    return await this.publicClient.getBlockNumber();
  }

  async getAmountOut(collateralIn) {
    return await this.bondingCurve.read.calculatePurchaseReturn([
      collateralIn,
    ]);
  }

  async getIssuanceSupply() {
    return await this.bondingCurve.read.getVirtualIssuanceSupply();
  }

  async getInflows(token, recipient, startBlock, endBlock) {
    const transactions = await this.ankrProvider.getTokenTransfers({
      address: recipient,
      fromBlock: startBlock,
      toBlock: endBlock,
      blockchain: this.networkIdString,
      pageSize: 10000,
    });

    return transactions.transfers
      .filter(
        (tx) => tx.toAddress.toLowerCase() === recipient.toLowerCase()
      )
      .filter(
        (tx) =>
          tx.contractAddress.toLowerCase() === token.toLowerCase()
      )
      .reduce((acc, tx) => {
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
  }

  async getIssuanceToken() {
    return await this.bondingCurve.read.getIssuanceToken();
  }

  async getSpotPrice() {
    return await this.bondingCurve.read.getStaticPriceForBuying();
  }

  async getBalances() {
    const { LinearVesting: vestings } = await this.indexerConnector(
      queryBuilder.indexer.vestings(
        this.chainId,
        this.addresses.orchestrator
      )
    );

    return vestings.reduce((acc, vesting) => {
      if (!acc[vesting.recipient]) {
        acc[vesting.recipient] = BigInt(vesting.amountRaw);
      } else {
        acc[vesting.recipient] += BigInt(vesting.amountRaw);
      }
      return acc;
    }, {});
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
