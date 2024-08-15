import { queries } from './queries.js';
import { QueryService } from './QueryService.js';

export class FundingPotService {
  nftContractAddress;
  multisigAddress;
  bondingCurveAddress;
  queryService;
  isPrivate;
  bondingCurve;
  issuanceToken;

  constructor({
    rpcUrl,
    indexerUrl,
    multisigAddress,
    blockExplorerUrl,
    nftContractAddress,
    bondingCurveAddress,
    isPrivate,
    customConfig,
  }) {
    this.multisigAddress = multisigAddress;
    this.bondingCurveAddress = bondingCurveAddress;
    this.nftContractAddress = nftContractAddress;
    this.queryService = new QueryService({
      rpcUrl,
      indexerUrl,
      blockExplorerUrl,
      bondingCurveAddress,
    });
    this.isPrivate = isPrivate;
  }

  async getAllocations() {
    // get start and end block
    const { startBlock, endBlock } = await this.getTimeframe();

    // get all token inflows that occured within timeframe
    const inflows = await this.queryService.getInflows(
      startBlock,
      endBlock
    );

    let permitted, rejected;
    // filter addresses for eligibility if private round
    // otherwise all inflows are eligible
    if (this.isPrivate) {
      // get list of qualified addresses
      const qualifiedAddresses = this.getQualifiedAddresses();
      // check permissions (if private round)
      ({ permitted, rejected } = this.checkPermissions(
        inflows,
        qualifiedAddresses
      ));
    } else {
      permitted = inflows;
    }

    // TODO
    // check for balance limits
    // const { accepted, reimburse } = this.checkBalanceLimit(
    //   permitted,
    //   rejected
    // );

    const allocations = await this.getAllocations(permitted);
  }

  async getTimeframe() {
    const timeframe = {};

    if (this.customConfig.startBlock) {
      timeframe['startBlock'] = this.customConfig.startBlock;
    } else {
      timeframe['startBlock'] =
        await this.queryService.getLastPurchaseBlock(
          this.multisigAddress
        );
    }

    if (this.customConfig.endBlock) {
      timeframe['endBlock'] = this.customConfig.endBlock;
    } else {
      timeframe['endBlock'] =
        await this.queryService.getCurrentBlockNumber();
    }

    return timeframe;
  }

  async getQualifiedAddresses() {
    if (this.customConfig.qualifiedAddresses) {
      return this.customConfig.qualifiedAddresses;
    } else {
      return await this.queryService.getQualifiedAddressesFromNft(
        nftContractAddress
      );
    }
  }

  checkPermissions(inflows, qualifiedAddresses) {
    const permitted = { ...inflows };
    const rejected = {};

    if (this.isPrivate) {
      // iterate over inflows, check if is in qualified addresses
      // if yes do nothing, if no, remove from permitted and add to rejected
    }

    return { permitted, rejected };
  }

  async checkBalanceLimit(inflows, qualifiedAddresses) {
    /*
        WHAT I HAVE:
        1. list of contributor addresses with how much each address has contributed (collateral tokens) 
        2. for each address, the current balance of issuance tokens (before batch buy)
        3. the current issuance supply (before batch buy)
        4. how much would be issued through the batch buy 
    */
    /* 
        WHAT I NEED:
        - list of contributor addresses with how much of their contribution is eligible to be used for batch buy
        e.g. if Alice contributed 200 tokens initially, but that would push here over the 2% threshold, how much can she contribute so that she doesn't have
        more than 2% of the issuance supply?
        - consider that this can be the case for multiple contributors at the same time
    */
  }

  async enrichInflowData(inflows, prospectiveNewSupply) {
    this.issuanceToken = await this.queryService.getIssuanceToken();

    const x = await this.queryService.getBatchBalances(
      this.issuanceToken,
      inflows
    );

    const enrichedData = Object.entries(inflows)
      .map(([address, amount]) => [address, { contribution: amount }])
      .map(([address, data]) => [
        address,
        {
          ...data,
          relBalance:
            parseFloat(data.contribution) /
            parseFloat(prospectiveNewSupply),
        },
      ]);

    return enrichedData;
  }

  async getAllocations(acceptedInflows) {
    const totalAmountIn = this.getAmountIn(acceptedInflows);
  }

  getAmountIn(contributions) {
    return Object.values(contributions).reduce((a, b) => a + b, 0n);
  }

  getRelativeContributions(contributions) {
    const totalContribution = this.getAmountIn(contributions);
    return Object.entries(contributions)
      .map(([address, amount]) => [
        address,
        {
          absContribution: amount,
          relContribution:
            parseFloat(amount) / parseFloat(totalContribution),
        },
      ])
      .reduce((acc, [address, data]) => {
        acc[address] = data;
        return acc;
      }, {});
  }
}
