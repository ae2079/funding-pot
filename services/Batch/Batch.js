import { formatUnits, parseUnits } from 'viem';
import { CAP } from '../../config.js';

export class Batch {
  data;

  constructor(totalCap, individualCap) {
    this.data = { totalCap, individualCap };

    // TODO: dynamic total cap based on previous batches
  }

  // STATE-MODIFYING METHODS

  checkEligibility(inflows, qualifiedAddresses) {
    this.data.participants = inflows;

    let totalEligibleContributions = 0n;

    const { participants } = this.data;
    for (const address of Object.keys(participants)) {
      if (
        !qualifiedAddresses
          .map((addr) => addr.toLowerCase())
          .includes(address.toLowerCase())
      ) {
        this.data.participants[address] = {
          ...participants[address],
          permitted: false,
        };
      } else {
        this.data.participants[address] = {
          ...participants[address],
          permitted: true,
        };
        totalEligibleContributions +=
          participants[address].contribution;
      }
    }

    this.data.totalEligibleContributions = totalEligibleContributions;
  }

  aggregateContributions() {
    const { participants } = this.data;

    const totalValidContribution = Object.entries(
      participants
    ).reduce((acc, [, data]) => {
      return data.validContribution
        ? acc + data.validContribution
        : acc;
    }, 0n);
    const totalExcessContribution = Object.entries(
      participants
    ).reduce((acc, [, data]) => {
      return data.excessContribution
        ? acc + data.excessContribution
        : acc;
    }, 0n);
    this.data = {
      totalValidContribution,
      totalExcessContribution,
      ...this.data,
    };
  }

  assessInflows(inflows, allowlist) {
    this.data.totalContribution = 0n;
    this.data.totalValidContribution = 0n;
    this.data.totalExcessContribution = 0n;
    this.data.participants = {};

    // iterate over the inflows
    for (const inflow of inflows) {
      const { participant, contribution } = inflow;

      // adds contribution to participants
      this.createOrAddContribution(participant, contribution);

      // if the inflow is not on the allowlis, everything is excess contribution
      if (!allowlist.includes(participant)) {
        this.manageContribution(participant, {
          excessContribution: contribution,
        });
        continue;
      }

      const p = this.data.participants[participant];
      const prevValid = p ? p.validContribution || 0n : 0n;

      // optimistic assumption to be challenged in the next steps
      let validContribution = contribution,
        excessContribution = 0n;

      // difference between individual cap and own contribution
      // if negative, means that the individual cap has been exceeded
      const individualDiff =
        this.data.individualCap - (prevValid + contribution);

      // means that the individual cap has been exceeded
      if (individualDiff < 0n) {
        // set valid contribution to difference between individual cap and own contributions
        validContribution = validContribution + individualDiff;
        // set excess contribution to the difference between the individual cap and own contribution
        excessContribution = individualDiff * -1n; //
      }

      // difference between total cap and own contribution
      // if negative, means that the total cap has been exceeded
      const totalDiff =
        this.data.totalCap -
        this.data.totalValidContribution -
        (prevValid + contribution);

      // means that the total cap has been exceeded
      if (totalDiff < 0n) {
        // what is the excess amount with respect to the total cap
        const e = totalDiff * -1n;
        // what is the valid amount with respect to the total cap
        const v = prevValid + contribution - e;
        // check which is more restrictive: the individual cap or the total cap
        const isMoreRestrictive = v < validContribution;
        // if total cap is more restrictive, overwrite valid contribution according to the total cap limit
        validContribution = isMoreRestrictive ? v : validContribution;
        // if total cap is more restrictive, overwrite excess contribution according to the total cap limit
        excessContribution = isMoreRestrictive
          ? e
          : excessContribution;
      }

      // add valid and excess contribution to participant
      this.manageContribution(participant, {
        validContribution,
        excessContribution,
      });
    }
  }

  calcAllocations(amountOut) {
    this.data.additionalIssuance = amountOut;

    const {
      totalValidContribution,
      additionalIssuance,
      participants,
    } = this.data;

    const totalValidContributionFloat = this.bigIntToFloat(
      totalValidContribution
    );
    const additionalIssuanceFloat = this.bigIntToFloat(
      additionalIssuance
    );

    for (const address of Object.keys(participants)) {
      const { validContribution } = participants[address];
      if (!validContribution) continue;

      const validContributionFloat =
        this.bigIntToFloat(validContribution);

      const contributionShare =
        validContributionFloat / totalValidContributionFloat;
      const issuanceAllocation =
        Math.floor(
          contributionShare * additionalIssuanceFloat * 10000
        ) / 10000;
      this.data.participants[address].issuanceAllocation =
        this.floatToBigInt(issuanceAllocation);
    }
  }

  calcValidExAnteContributions(reports) {
    let exAnteTotalValidContributions = 0n;

    const reportNumbers = Object.keys(reports);
    // get aggregate historic contributions from reports
    for (const reportNumber of reportNumbers) {
      const report = reports[reportNumber];
      const { participants } = report.batch;

      for (const address of Object.keys(participants)) {
        if (!participants[address].validContribution > 0n) continue;
        exAnteTotalValidContributions +=
          participants[address].validContribution;
      }
    }

    this.data.exAnteTotalValidContributions =
      exAnteTotalValidContributions;
  }

  // INTERNAL HELPER FUNCTIONS

  manageContribution(addr, contributionObj) {
    const { excessContribution, validContribution } = contributionObj;

    if (!this.data.participants[addr].excessContribution) {
      this.data.participants[addr].excessContribution =
        excessContribution || 0n;
    } else {
      this.data.participants[addr].excessContribution +=
        excessContribution;
    }

    if (!this.data.participants[addr].validContribution) {
      this.data.participants[addr].validContribution =
        validContribution || 0n;
    } else {
      this.data.participants[addr].validContribution +=
        validContribution;
    }

    this.data.totalExcessContribution += excessContribution || 0n;
    this.data.totalValidContribution += validContribution || 0n;
  }

  createOrAddContribution(addr, contribution) {
    if (!this.data.participants[addr]) {
      this.data.participants[addr] = { contribution };
    } else {
      this.data.participants[addr].contribution += contribution;
    }
    this.data.totalContribution += contribution;
  }

  // GETTERS

  getContributors() {
    return Object.keys(this.data.participants).filter(
      (address) => this.data.participants[address].permitted
    );
  }

  getAllocations() {
    const { participants } = this.data;
    return Object.entries(participants)
      .filter(([, data]) => data.issuanceAllocation)
      .map(([address, data]) => {
        return {
          recipient: address,
          amount: data.issuanceAllocation,
        };
      });
  }

  // STATIC

  bigIntToFloat(bigInt) {
    return parseFloat(formatUnits(bigInt, 18));
  }

  floatToBigInt(float) {
    return parseUnits(float.toString(), 18);
  }

  diffOrZero(a, b) {
    return a - b > 0n ? a - b : 0n;
  }
}
