import { formatUnits, parseUnits } from 'viem';

export class Allocations {
  data;

  constructor(participants) {
    this.data = { participants };
  }

  checkEligibility(qualifiedAddresses) {
    const { participants } = this.data;
    for (const address of Object.keys(participants)) {
      if (!qualifiedAddresses.includes(address)) {
        this.data.participants[address] = {
          ...participants[address],
          permitted: false,
        };
      } else {
        this.data.participants[address] = {
          ...participants[address],
          permitted: true,
        };
      }
    }
  }

  addContributionData() {
    const { participants } = this.data;
    const totalContributions = Object.entries(participants)
      .filter(([address]) => participants[address].permitted)
      .reduce((acc, [, data]) => {
        return acc + data.contribution;
      }, 0n);
    const totalReimbursements = Object.entries(participants)
      .filter(([address]) => !participants[address].permitted)
      .reduce((acc, [, data]) => {
        return acc + data.contribution;
      }, 0n);
    this.data = {
      totalContributions,
      totalReimbursements,
      ...this.data,
    };
  }

  calculateRawAllocations(amountOut) {
    this.data.totalIssuance = amountOut;

    const { totalContributions, totalIssuance, participants } =
      this.data;

    const totalCongtributionFloat = parseFloat(
      formatUnits(totalContributions, 18)
    );
    const totalIssuanceFloat = parseFloat(
      formatUnits(totalIssuance, 18)
    );

    for (const address of Object.keys(participants)) {
      const { contribution } = participants[address];
      const contributionFloat = parseFloat(
        formatUnits(contribution, 18)
      );
      const contributionShare =
        contributionFloat / totalCongtributionFloat;
      const issuanceAllocation =
        Math.floor(contributionShare * totalIssuanceFloat * 10000) /
        10000;
      console.log(issuanceAllocation);
      this.data.participants[address].rawIssuanceAllocation =
        parseUnits(issuanceAllocation.toString(), 18);
    }
  }

  getContributors() {
    return Object.keys(this.data.participants).filter(
      (address) => this.data.participants[address].permitted
    );
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
    this.issuanceToken = await this.Queries.getIssuanceToken();

    const x = await this.Queries.getBatchBalances(
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
    const amountOut = await this.Queries.getAmountOut(totalAmountIn);

    const withAllocations = Object.fromEntries(
      Object.entries(acceptedInflows).map(([address, amount]) => [
        address,
        {
          contribution: amount,
          allocation: this.calculateAlloc(
            amount,
            totalAmountIn,
            amountOut
          ),
        },
      ])
    );

    return withAllocations;
  }

  calculateAlloc(contribution, totalAmountIn, amountOut) {
    const contributionFloat = parseFloat(
      formatUnits(contribution, 18)
    );
    const totalAmountInFloat = parseFloat(
      formatUnits(totalAmountIn, 18)
    );
    const amountOutFloat = parseFloat(formatUnits(amountOut, 18));

    return parseUnits(
      (
        (contributionFloat / totalAmountInFloat) *
        amountOutFloat
      ).toString(),
      18
    );
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
