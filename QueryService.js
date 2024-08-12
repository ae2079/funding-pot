import { queries } from './queries.js';

export class QueryService {
  rpcUrl;
  indexerUrl;
  blockExplorerUrl;

  constructor({ rpcUrl, indexerUrl, blockExplorerUrl }) {
    this.rpcUrl = rpcUrl;
    this.indexerUrl = indexerUrl;
    this.blockExplorerUrl = blockExplorerUrl;
  }

  // QUERIES

  async getTimeframe({ startBlock, endBlock, address }) {
    if (!startBlock) {
      startBlock = await this.getStartBlock(address);
    }
    if (!endBlock) {
      endBlock = await this.getCurrentBlockNumber();
    }
    return {
      startBlock: await this.getStartBlock(address),
      endBlock: await this.getCurrentBlockNumber(),
    };
  }

  async getStartBlock(address) {
    const {
      Swap: [lastBuy],
    } = await this.indexerConnector(
      queries.indexer.lastBuyBlocknumber(address)
    );
    return lastBuy.blockTimestamp;
  }

  async getCurrentBlockNumber() {
    const blockInHex = await this.rpcConnector(
      queries.rpc.currentBlockNumber()
    );

    return parseInt(blockInHex, 16);
  }

  async getInflows(token, recipient, startBlock, endBlock) {
    const transactions = await this.blockExplorerConnector(
      queries.blockExplorer.erc20Transactions(
        token,
        recipient,
        startBlock,
        endBlock
      )
    );

    return transactions
      .filter((tx) => tx.to.toLowerCase() === recipient.toLowerCase())
      .reduce((acc, tx) => {
        const { from, value } = tx;
        if (!acc[from]) {
          acc[from] = BigInt(value);
        } else {
          acc[from] += BigInt(value);
        }
        return acc;
      }, {});
  }

  async getNftHolders(token, endBlock) {
    const transactions = await this.blockExplorerConnector(
      queries.blockExplorer.erc721Mints(token, endBlock)
    );
    return Array.from(new Set(transactions.map((tx) => tx.to)));
  }

  // CONNECTORS

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

  async rpcConnector(requestBody) {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    const { result } = await response.json();
    return result;
  }

  async blockExplorerConnector(urlParams) {
    let transactions = [];
    let hasMoreTransactions = true;
    let pageCounter = 1;
    while (hasMoreTransactions) {
      urlParams['page'] = pageCounter;
      const url = `${this.blockExplorerUrl}?${new URLSearchParams(
        urlParams
      ).toString()}`;
      const response = await fetch(url);
      const x = await response.json();
      const { result } = x;
      transactions = [...transactions, ...result];
      pageCounter++;
      hasMoreTransactions = result.length === 2000;
    }

    return transactions;
  }
}
