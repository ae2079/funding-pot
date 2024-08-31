import { formatUnits, parseUnits } from 'viem';

export class Allocations {
  data;
  relativeCap;

  constructor(participants) {
    this.data = { participants };
    this.relativeCap = 0.02;
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

  calculateActualContributions(
    exAnteSupply,
    exAnteSpotPrice,
    exAnteBalances
  ) {
    // store exAnteSupply and exAnteSpotPrice
    this.data.exAnteSupply = exAnteSupply;
    this.data.exAnteSpotPrice = exAnteSpotPrice;

    // calculate individual and store individual cap
    this.data.issuanceTokenCap = parseUnits(
      (
        this.relativeCap * parseFloat(formatUnits(exAnteSupply, 18))
      ).toString(),
      18
    );

    const relSpotPrice = parseFloat(exAnteSpotPrice) / 100000;

    // calculate excess contribution and store
    for (const address of Object.keys(exAnteBalances)) {
      const { contribution, permitted } =
        this.data.participants[address];
      const exAnteBalance = exAnteBalances[address];
      const issuanceTokenPotential =
        this.data.issuanceTokenCap - exAnteBalance; // how many issuance token, the address may buy

      // if no more issuance token potential, all contributions are excess contributions
      if (issuanceTokenPotential <= 0n) {
        this.data.participants[address].excessContribution =
          contribution;
        continue;
      }

      // if user is not permitted, all contributions are excess contributions
      if (!permitted) {
        this.data.participants[address].excessContribution =
          contribution;
        continue;
      }

      // based on ex ante spot price, ex ante balance, and issuance token potential, calculate contribution potential
      // store per address
      const contributionPotentialFloat =
        this.bigIntToFloat(issuanceTokenPotential) * relSpotPrice;
      const contributionPotential = this.floatToBigInt(
        contributionPotentialFloat
      );

      // if contribution is larger than contribution potential
      // note excess contribution and actual contribution
      // if contribution is below contribution potential
      // all contributions are actual contributions
      if (contribution > contributionPotential) {
        const excess = contribution - contributionPotential;
        this.data.participants[address].excessContribution = excess;
        this.data.participants[address].actualContribution =
          contributionPotential;
      } else {
        this.data.participants[address].actualContribution =
          contribution;
      }
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

  bigIntToFloat(bigInt) {
    return parseFloat(formatUnits(bigInt, 18));
  }

  floatToBigInt(float) {
    return parseUnits(float.toString(), 18);
  }
}
