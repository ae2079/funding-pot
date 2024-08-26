import {
  createPublicClient,
  http,
  getContract,
  erc20Abi,
} from 'viem';
import { queries } from './queryBuilder.js';
import { bondingCurveAbi } from '../../abis.js';
import { AnkrProvider } from '@ankr.com/ankr.js';

export class Queries {
  indexerUrl;
  blockExplorerUrl;
  publicClient;
  bondingCurve;
  issuanceToken;
  ankrProvider;
  networkIdString;

  constructor({
    rpcUrl,
    indexerUrl,
    blockExplorerUrl,
    chainId,
    bondingCurveAddress,
    issuanceTokenAddress,
  }) {
    this.indexerUrl = indexerUrl;
    this.blockExplorerUrl = blockExplorerUrl;
    this.publicClient = createPublicClient({
      chain: chainId,
      transport: http(rpcUrl),
    });
    this.bondingCurve = getContract({
      address: bondingCurveAddress,
      client: this.publicClient,
      abi: bondingCurveAbi,
    });
    this.networkIdString = this.getNetworkIdString(rpcUrl);
    this.ankrProvider = new AnkrProvider(
      this.getAdvancedApiEndpoint(rpcUrl)
    );
  }

  // QUERIES

  async getTimeframe({ startBlock, endBlock, address }) {
    if (!startBlock) {
      startBlock = await this.getLastPurchaseBlock(address);
    }
    if (!endBlock) {
      endBlock = await this.getCurrentBlockNumber();
    }
    return {
      startBlock: await this.getLastPurchaseBlock(address),
      endBlock: await this.getCurrentBlockNumber(),
    };
  }

  async getLastPurchaseBlock(address) {
    const {
      Swap: [lastBuy],
    } = await this.indexerConnector(
      queries.indexer.lastBuyBlocknumber(address)
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
        const { fromAddress, value } = tx;
        if (!acc[fromAddress]) {
          acc[fromAddress] = parseFloat(value);
        } else {
          acc[fromAddress] += parseFloat(value);
        }
        return acc;
      }, {});
  }

  async getNftHolders(token) {
    const { holders } = await this.ankrProvider.getNFTHolders({
      blockchain: this.networkIdString,
      contractAddress: token,
    });
    return holders;
  }

  async getBalances(token, addresses) {
    const { holders } = await this.ankrProvider.getTokenHolders({
      blockchain: this.networkIdString,
      contractAddress: token,
    });

    const filteredHolders = holders
      .filter((holder) =>
        addresses.includes(holder.holderAddress.toLowerCase())
      )
      .reduce((obj, holder) => {
        obj[holder.holderAddress] = holder.balanceRawInteger;
        return obj;
      }, {});

    return filteredHolders;
  }

  async getIssuanceToken() {
    return await this.bondingCurve.read.getIssuanceToken();
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
