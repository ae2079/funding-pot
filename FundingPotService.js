import { queries } from './queries.js';

export class FundingPotService {
  rpcUrl;
  indexerUrl;
  chainId;
  multisigAddress;

  constructor({ rpcUrl, indexerUrl, chainId, multisigAddress }) {
    this.rpcUrl = rpcUrl;
    this.indexerUrl = indexerUrl;
    this.chainId = chainId;
    this.multisigAddress = multisigAddress;
  }

  getRoundTransactions() {
    // get cutoff date (= last batch buy)
    const cutoff = this.getCutoffDate();

    // get all token inflows that occured since cutoff
    const inflows = this.getInflows(cutoff);

    // get qualified and non-qualified inflows
    // qualified: eligible to join the funding round
    // non-qualified: are reimbursed
    const { qualified, nonQualified } = this.classifyInflows(inflows);

    this.processNonQualifiedInflows(nonQualified);
    // 1. reimburse non-qualified inflows

    // 2. proceed with
  }

  async getCutoffBlockNumber() {
    const {
      Swap: [lastBuy],
    } = await this.queryIndexer(
      queries.lastBuyBlocknumber(this.multisigAddress)
    );
    return lastBuy.blockTimestamp;
  }

  getInflows(cutoff) {}

  classifyInflows() {}

  processQualifiedInflows(qualified) {}

  processNonQualifiedInflows(nonQualified) {
    //
  }

  async queryIndexer(query) {
    const result = await fetch(this.indexerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    });

    const { data } = await result.json();

    return data;
  }
}
