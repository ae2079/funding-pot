import { formatUnits, parseUnits } from 'viem';

export class Batch {
  data;

  constructor({ batchConfig, batchReports }) {
    const isEarlyAccess = batchConfig.IS_EARLY_ACCESS;
    const individualLimit = parseUnits(
      batchConfig.LIMITS.INDIVIDUAL,
      18
    );
    // since batch caps are accumulative, if it is not the very first batch
    // we need to consider how much was already contributed in previous batches
    let totalBatchLimit = parseUnits(batchConfig.LIMITS.TOTAL, 18);
    for (const reportNr in batchReports) {
      const report = batchReports[reportNr];
      totalBatchLimit -= BigInt(report.totalValidContribution);
    }
    const totalLimit = totalBatchLimit;

    this.data = { totalLimit, individualLimit, isEarlyAccess };
  }

  assessInflows(inflows, allowlist, nftHolders) {
    this.data.totalContribution = 0n;
    this.data.totalValidContribution = 0n;
    this.data.totalInvalidContribution = 0n;
    this.data.participants = {};

    // iterate over the inflows
    for (const inflow of inflows) {
      const { participant, contribution } = inflow;

      // adds contribution to participants
      this.createOrAddContribution(participant, contribution);

      // if the inflow is not on the allowlist, everything is invalid contribution
      // OR if it's an early access batch and the participant is not an NFT holder
      if (
        !allowlist.includes(participant) ||
        (this.data.isEarlyAccess && !nftHolders.includes(participant))
      ) {
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
