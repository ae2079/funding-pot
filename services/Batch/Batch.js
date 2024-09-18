import { formatUnits, parseUnits } from 'viem';
import { CAP } from '../../config.js';

export class Batch {
  data;

  constructor(totalCap, individualCap) {
    this.data = { totalCap, individualCap };
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

      // add contribution to total contribution (regardless whether valid or not)
      this.data.totalContribution += contribution;

      // if participant doesn't exist yet add to participants
      if (!this.data.participants[participant]) {
        this.data.participants[participant] = {
          contribution,
        };
      } else {
        this.data.participants[participant].contribution +=
          contribution;
      }

      // if the inflow is not on the allowlis, everything is excess contribution
      if (!allowlist.includes(participant)) {
        this.manageContribution(participant, {
          excessContribution: contribution,
        });
        continue;
      }

      const p = this.data.participants[participant];
      const prevValid = p ? p.validContribution || 0n : 0n;

      const isBelowIndividualCap =
        prevValid + contribution <= this.data.individualCap;
      const isBelowTotalCap =
        prevValid + contribution <= this.data.totalCap;

      // if contribution is below any cap everything is valid
      if (isBelowIndividualCap && isBelowTotalCap) {
        this.manageContribution(participant, {
          validContribution: contribution,
          contribution,
        });
        continue;
      }

      // now we check for caps
      // first check what would be the valid contribution honoring just the individual cap
      // then check what would be the valid contribution honoring just the total cap
      // then choose the one that is smaller
      let v1, e1, v2, e2;
      // case 1: contributor exceeds individual cap
      if (!isBelowIndividualCap) {
        // max possible contribution is difference between cap and previous contribution
        v1 = this.data.individualCap - prevValid;
        // excess is the diff between what would have been valit contribution without any cap and the cap
        e1 = prevValid + contribution - this.data.individualCap;
      }

      // case 2: contributor exceeds total cap
      if (!isBelowTotalCap) {
        // max possible contribution is difference between total cap and previous contribution
        v2 = this.data.totalCap - prevValid;
        // excess is the diff between what would have been valid contribution without any cap and the cap
        e2 = prevValid + contribution - this.data.totalCap;
      }

      // case1 and case2 are not mutually exclusive
      // if only one applies choose that case
      // if both apply choose the one that leads to the smaller contribution
      let validContribution, excessContribution;
      if (v1 !== undefined && v2 === undefined) {
        validContribution = v1;
        excessContribution = e1;
      } else if (v1 === undefined && v2 !== undefined) {
        validContribution = v2;
        excessContribution = e2;
      } else if (v1 < v2) {
        validContribution = v1;
        excessContribution = e1;
      } else {
        validContribution = v2;
        excessContribution = e2;
      }

      this.manageContribution(participant, {
        validContribution,
        excessContribution,
        contribution,
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

  // HELPER FUNCTIONS

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
