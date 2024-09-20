import { formatUnits, parseUnits } from 'viem';
import { CAP } from '../../config.js';

export class Batch {
  data;

  constructor({ batchConfig }) {
    const totalLimit = parseUnits(batchConfig.CAPS.TOTAL, 18);
    const individualLimit = parseUnits(
      batchConfig.CAPS.INDIVIDUAL,
      18
    );
    this.data = { totalLimit, individualLimit };

    // TODO: dynamic total cap based on previous batches
  }

  assessInflows(inflows, allowlist) {
    this.data.totalContribution = 0n;
    this.data.totalValidContribution = 0n;
    this.data.totalInvalidContribution = 0n;
    this.data.participants = {};

    // iterate over the inflows
    for (const inflow of inflows) {
      const { participant, contribution } = inflow;

      // adds contribution to participants
      this.createOrAddContribution(participant, contribution);

      // if the inflow is not on the allowlis, everything is invalid contribution
      if (!allowlist.includes(participant)) {
        this.manageContribution(participant, {
          invalidContribution: contribution,
        });
        continue;
      }

      const p = this.data.participants[participant];
      const prevValid = p ? p.validContribution || 0n : 0n;

      // optimistic assumption to be challenged in the next steps
      let validContribution = contribution,
        invalidContribution = 0n;

      // difference between individual cap and own contribution
      // if negative, means that the individual cap has been exceeded
      const individualDiff =
        this.data.individualLimit - (prevValid + contribution);

      // means that the individual cap has been exceeded
      if (individualDiff < 0n) {
        // set valid contribution to difference between individual cap and own contributions
        validContribution = validContribution + individualDiff;
        // set invalid contribution to the difference between the individual cap and own contribution
        invalidContribution = individualDiff * -1n; //
      }

      // difference between total cap and own contribution
      // if negative, means that the total cap has been exceeded
      const totalDiff =
        this.data.totalLimit -
        this.data.totalValidContribution -
        (prevValid + contribution);

      // means that the total cap has been exceeded
      if (totalDiff < 0n) {
        // what is the invalid amount with respect to the total cap
        const e = totalDiff * -1n;
        // what is the valid amount with respect to the total cap
        const v = prevValid + contribution - e;
        // check which is more restrictive: the individual cap or the total cap
        const isMoreRestrictive = v < validContribution;
        // if total cap is more restrictive, overwrite valid contribution according to the total cap limit
        validContribution = isMoreRestrictive ? v : validContribution;
        // if total cap is more restrictive, overwrite invalid contribution according to the total cap limit
        invalidContribution = isMoreRestrictive
          ? e
          : invalidContribution;
      }

      // add valid and invalid contribution to participant
      this.manageContribution(participant, {
        validContribution,
        invalidContribution,
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

  // INTERNAL HELPER FUNCTIONS

  manageContribution(addr, contributionObj) {
    const { invalidContribution, validContribution } =
      contributionObj;

    if (!this.data.participants[addr].invalidContribution) {
      this.data.participants[addr].invalidContribution =
        invalidContribution || 0n;
    } else {
      this.data.participants[addr].invalidContribution +=
        invalidContribution;
    }

    if (!this.data.participants[addr].validContribution) {
      this.data.participants[addr].validContribution =
        validContribution || 0n;
    } else {
      this.data.participants[addr].validContribution +=
        validContribution;
    }
    this.data.totalInvalidContribution += invalidContribution || 0n;
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
