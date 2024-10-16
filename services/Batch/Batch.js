import { formatUnits, parseUnits } from 'viem';

export class Batch {
  config;
  data;

  constructor({ batchConfig, batchReports }) {
    const isEarlyAccess = batchConfig.IS_EARLY_ACCESS;
    const individualLimit = this.denominatedInCollateral(
      batchConfig.LIMITS.INDIVIDUAL,
      batchConfig.PRICE
    );
    // since batch caps are accumulative, if it is not the very first batch
    // we need to consider how much was already contributed in previous batches
    this.config = {
      totalLimit: this.denominatedInCollateral(
        batchConfig.LIMITS.TOTAL,
        batchConfig.PRICE
      ),
      totalLimit2: this.denominatedInCollateral(
        batchConfig.LIMITS.TOTAL_2,
        batchConfig.PRICE
      ),
    };

    // similar for individual caps we need to know how much each address had already contributed before
    // because we need it to calculate the individual cap per round
    const aggregatedPreviousContributions = {};
    // therefore we iterate over previous reports and calculate the "real" applicable limits
    for (const reportNr in batchReports) {
      const report = batchReports[reportNr];
      this.config.totalLimit -= BigInt(report.totalValidContribution);
      this.config.totalLimit2 -= BigInt(
        report.totalValidContribution
      );

      for (const address in report.participants) {
        const contribution = report.participants[address];
        if (!contribution.validContribution) continue;
        if (!aggregatedPreviousContributions[address]) {
          aggregatedPreviousContributions[address] =
            contribution.validContribution;
        } else {
          aggregatedPreviousContributions[address] +=
            contribution.validContribution;
        }
      }
    }
    this.config = {
      ...this.config,
      individualLimit,
      individualLimit2:
        batchConfig.LIMITS.INDIVIDUAL_2 &&
        this.denominatedInCollateral(
          batchConfig.LIMITS.INDIVIDUAL_2,
          batchConfig.PRICE
        ),
      isEarlyAccess,
      price: batchConfig.PRICE,
    };
    this.data = { aggregatedPreviousContributions };
  }

  assessInflows(inflows, allowlist, nftHolders) {
    this.data.totalContribution = 0n;
    this.data.totalValidContribution = 0n;
    this.data.totalInvalidContribution = 0n;
    this.data.participants = {};

    // iterate over the inflows
    for (const inflow of inflows) {
      let invalidReason;

      const { participant, contribution } = inflow;

      // adds contribution to participants
      this.createOrAddContribution(inflow);

      // if the inflow is not on the allowlist, everything is invalid contribution
      // OR if it's an early access batch and the participant is not an NFT holder
      if (
        !allowlist.includes(participant) ||
        (this.config.isEarlyAccess &&
          !nftHolders.includes(participant))
      ) {
        this.manageContribution(inflow, {
          invalidContribution: contribution,
          invalidReason: 'not on allowlist',
        });
        continue;
      }

      const p = this.data.participants[participant];
      const prevValid = p ? p.validContribution || 0n : 0n;

      // optimistic assumption to be challenged in the next steps
      let validContribution = contribution,
        invalidContribution = 0n;

      // todo: get applicable individual limit
      // get individual limit considering potential previous contributions
      const participantLimit =
        this.getApplicableIndividualLimit(participant);

      // difference between individual cap and own contribution
      // if negative, means that the individual cap has been exceeded
      const individualDiff =
        participantLimit - (prevValid + contribution);

      // means that the individual cap has been exceeded
      if (individualDiff < 0n) {
        // set valid contribution to difference between individual cap and own contributions
        validContribution = validContribution + individualDiff;
        // set invalid contribution to the difference between the individual cap and own contribution
        invalidContribution = individualDiff * -1n; //
        invalidReason = 'individual cap exceeded';
      }

      // difference between total cap and own contribution
      // if negative, means that the total cap has been exceeded
      const totalDiff =
        (this.config.isEarlyAccess
          ? this.config.totalLimit
          : this.config.totalLimit2) -
        this.data.totalValidContribution -
        (prevValid + contribution);

      // means that the total cap has been exceeded
      if (totalDiff < 0n) {
        // what is the invalid amount with respect to the total cap ("excess")
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

        if (isMoreRestrictive) {
          invalidReason = 'total cap exceeded';
        }
      }

      // add valid and invalid contribution to participant
      this.manageContribution(inflow, {
        validContribution,
        invalidContribution,
        invalidReason,
      });

      this.data.participants[participant].participantLimit =
        participantLimit;
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

  manageContribution(inflow, contributionObj) {
    const { participant } = inflow;

    const { invalidContribution, validContribution, invalidReason } =
      contributionObj;

    const adjustedInvalidContribution = invalidContribution || 0n;
    const adjustedValidContribution = validContribution || 0n;

    if (!this.data.participants[participant].invalidContribution) {
      this.data.participants[participant].invalidContribution =
        adjustedInvalidContribution;
    } else {
      this.data.participants[participant].invalidContribution +=
        adjustedInvalidContribution;
    }

    if (!this.data.participants[participant].validContribution) {
      this.data.participants[participant].validContribution =
        adjustedValidContribution;
    } else {
      this.data.participants[participant].validContribution +=
        adjustedValidContribution;
    }

    this.data.totalInvalidContribution += adjustedInvalidContribution;
    this.data.totalValidContribution += adjustedValidContribution;

    const lastTxIdx =
      this.data.participants[participant].transactions.length - 1;
    this.data.participants[participant].transactions[lastTxIdx] = {
      ...this.data.participants[participant].transactions[lastTxIdx],
      invalidContribution,
      validContribution,
      invalidReason,
    };
  }

  createOrAddContribution(inflow) {
    const { participant, contribution, transactionHash } = inflow;
    if (!this.data.participants[participant]) {
      this.data.participants[participant] = {
        contribution,
        transactions: [{ transactionHash, contribution }],
      };
    } else {
      this.data.participants[participant].contribution +=
        contribution;
      this.data.participants[participant].transactions.push({
        transactionHash,
        contribution,
      });
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

  denominatedInCollateral(amount, price) {
    return parseUnits(
      (parseFloat(amount) / parseFloat(price)).toString(),
      18
    );
  }

  denominatedInDollars(amount, price) {
    return parseUnits(
      (parseFloat(amount) * parseFloat(price)).toString(),
      18
    );
  }

  getApplicableTotalLimit(batchConfig) {
    if (batchConfig.IS_EARLY_ACCESS === true) {
      return this.denominatedInCollateral(
        batchConfig.LIMITS.TOTAL,
        batchConfig.PRICE
      );
    } else if (batchConfig.IS_EARLY_ACCESS === false) {
      return this.denominatedInCollateral(
        batchConfig.LIMITS.TOTAL_2,
        batchConfig.PRICE
      );
    }
  }

  getApplicableIndividualLimit(participant) {
    // if it's an early access round, return the adjustedIndividualLimit
    // which is based on the defined individual limti per batch and all contributions
    // that have been made previously by the participant
    if (this.config.isEarlyAccess) {
      return this.data.aggregatedPreviousContributions[participant]
        ? this.config.individualLimit -
            this.data.aggregatedPreviousContributions[participant]
        : this.config.individualLimit;
      // if it is not an early access round the rules are different
    } else if (!this.config.isEarlyAccess) {
      // if all total aggregated valid contribution is less than the total limit
      // the individual can contribute up to `LIMIT` (=> can contribute more)
      if (this.data.totalValidContribution < this.config.totalLimit) {
        return this.config.individualLimit;
      } else {
        // if the "soft total limit has been reached", the individual limit is lowered to `LIMIT_2`
        return this.config.individualLimit2;
      }
    }
  }
}
