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
    this.data.newIssuance = amountOut;

    const { totalContributions, newIssuance, participants } =
      this.data;

    const totalContributionFloat = parseFloat(
      formatUnits(totalContributions, 18)
    );
    const newIssuanceFloat = parseFloat(formatUnits(newIssuance, 18));

    for (const address of Object.keys(participants)) {
      const { contribution, permitted } = participants[address];
      if (!permitted) continue;
      const contributionFloat = parseFloat(
        formatUnits(contribution, 18)
      );
      const contributionShare =
        contributionFloat / totalContributionFloat;
      const issuanceAllocation =
        Math.floor(contributionShare * newIssuanceFloat * 10000) /
        10000;
      this.data.participants[address].rawIssuanceAllocation =
        parseUnits(issuanceAllocation.toString(), 18);
    }
  }

  getContributors() {
    return Object.keys(this.data.participants).filter(
      (address) => this.data.participants[address].permitted
    );
  }

  checkBalanceLimit(currentIssuanceSupply, currentBalances) {
    const { newIssuance } = this.data;
    const newIssuanceSupply = currentIssuanceSupply + newIssuance;
    this.data.currentIssuanceSupply = currentIssuanceSupply;
    this.data.newIssuanceSupply = newIssuanceSupply;
    const balanceLimitFloat =
      0.02 * parseFloat(formatUnits(newIssuanceSupply, 18));
    const balanceLimitBigInt = parseUnits(
      balanceLimitFloat.toFixed(18),
      18
    );
    this.data.balanceLimit = balanceLimitBigInt;

    for (const address of Object.keys(currentBalances)) {
      const { rawIssuanceAllocation, permitted } =
        this.data.participants[address];
      if (!permitted) continue;
      const currentBalance = currentBalances[address];
      const newProspectiveBalance =
        currentBalance + rawIssuanceAllocation;
      const excess = newProspectiveBalance - balanceLimitBigInt;
      if (excess <= 0n) continue;
      this.data.participants[address].excess = excess;
    }
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
