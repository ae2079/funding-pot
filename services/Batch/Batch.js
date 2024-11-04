import { formatUnits, parseUnits } from 'viem';

export class Batch {
  config;
  data;

  constructor({ batchConfig, batchReports }) {
    const isEarlyAccess = batchConfig.IS_EARLY_ACCESS;
    this.config = {
      limits: {
        totalLimit: {
          inCollateral: this.toCollateral(
            batchConfig.LIMITS.TOTAL,
            batchConfig.PRICE
          ),
        },
        totalLimit2: isEarlyAccess
          ? undefined
          : {
              inCollateral: this.toCollateral(
                batchConfig.LIMITS.TOTAL_2,
                batchConfig.PRICE
              ),
            },
        individualLimit: {
          inDollar: parseFloat(batchConfig.LIMITS.INDIVIDUAL),
          inCollateral: this.toCollateral(
            batchConfig.LIMITS.INDIVIDUAL,
            batchConfig.PRICE
          ),
        },
        individualLimit2: isEarlyAccess
          ? undefined
          : {
              inDollar: parseFloat(batchConfig.LIMITS.INDIVIDUAL_2),
              inCollateral:
                batchConfig.LIMITS.INDIVIDUAL_2 &&
                this.toCollateral(
                  batchConfig.LIMITS.INDIVIDUAL_2,
                  batchConfig.PRICE
                ),
            },
      },
      price: batchConfig.PRICE,
      isEarlyAccess,
    };

    // for individual caps we need to know how much each address had already contributed before
    // because we need it to calculate the individual cap per round
    const aggregatedPreviousContributions = {};
    // since batch caps are accumulative,
    // we need to consider how much was already contributed in previous batches
    for (const reportNr in batchReports) {
      const report = batchReports[reportNr];
      this.config.limits.totalLimit.inCollateral -= BigInt(
        report.batch.data.totalValidContribution.inCollateral
      );

      if (!isEarlyAccess) {
        this.config.limits.totalLimit2.inCollateral -= BigInt(
          report.batch.data.totalValidContribution.inCollateral
        );
      }

      for (const address in report.batch.data.participants) {
        const contribution = report.batch.data.participants[address];
        if (!contribution.validContribution) continue;
        if (!aggregatedPreviousContributions[address]) {
          aggregatedPreviousContributions[address] = {
            inCollateral: BigInt(
              contribution.validContribution.inCollateral
            ),
            inDollar: parseFloat(
              contribution.validContribution.inDollar
            ),
          };
        } else {
          aggregatedPreviousContributions[address].inCollateral +=
            BigInt(contribution.validContribution.inCollateral);
          aggregatedPreviousContributions[address].inDollar +=
            parseFloat(contribution.validContribution.inDollar);
        }
      }
    }

    this.config.limits.totalLimit.inDollar = this.toDollar(
      this.config.limits.totalLimit.inCollateral,
      this.config.price
    );
    if (!isEarlyAccess) {
      this.config.limits.totalLimit2.inDollar = this.toDollar(
        this.config.limits.totalLimit.inCollateral,
        this.config.price
      );
    }
    this.data = { aggregatedPreviousContributions };
  }

  assessInflows(inflows, allowlist, nftHolders) {
    this.data.totalContribution = { inCollateral: 0n, inDollar: 0 };
    this.data.totalValidContribution = {
      inCollateral: 0n,
      inDollar: 0,
    };
    this.data.totalInvalidContribution = {
      inCollateral: 0n,
      inDollar: 0,
    };
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
      const prevValid =
        p && p.validContribution
          ? p.validContribution.inCollateral || 0n
          : 0n;

      // optimistic assumption to be challenged in the next steps
      let validContribution = contribution,
        invalidContribution = 0n;

      // todo: get applicable individual limit
      // get individual limit considering potential previous contributions
      const adjustedIndividualLimit =
        this.getAdjustedIndividualLimit(participant);

      // difference between individual cap and own contribution
      // if negative, means that the individual cap has been exceeded
      const individualDiff =
        adjustedIndividualLimit.inCollateral -
        (prevValid + contribution);

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
          ? this.config.limits.totalLimit.inCollateral
          : this.config.limits.totalLimit2.inCollateral) -
        this.data.totalValidContribution.inCollateral -
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

      this.data.participants[participant].adjustedIndividualLimit =
        adjustedIndividualLimit;
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
      totalValidContribution.inCollateral
    );
    const additionalIssuanceFloat = this.bigIntToFloat(
      additionalIssuance
    );

    for (const address of Object.keys(participants)) {
      const { validContribution } = participants[address];
      if (!validContribution) continue;

      const validContributionFloat = this.bigIntToFloat(
        validContribution.inCollateral
      );

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
      this.data.participants[participant].invalidContribution = {
        inCollateral: adjustedInvalidContribution,
        inDollar: this.toDollar(
          adjustedInvalidContribution,
          this.config.price
        ),
      };
    } else {
      this.data.participants[
        participant
      ].invalidContribution.inCollateral +=
        adjustedInvalidContribution;
      this.data.participants[
        participant
      ].invalidContribution.inDollar += this.toDollar(
        adjustedInvalidContribution,
        this.config.price
      );
    }

    if (!this.data.participants[participant].validContribution) {
      this.data.participants[participant].validContribution = {
        inCollateral: adjustedValidContribution,
        inDollar: this.toDollar(
          adjustedValidContribution,
          this.config.price
        ),
      };
    } else {
      this.data.participants[
        participant
      ].validContribution.inCollateral += adjustedValidContribution;
      this.data.participants[
        participant
      ].validContribution.inDollar += this.toDollar(
        adjustedValidContribution,
        this.config.price
      );
    }

    this.data.totalInvalidContribution.inCollateral +=
      adjustedInvalidContribution;
    this.data.totalInvalidContribution.inDollar += this.toDollar(
      adjustedInvalidContribution,
      this.config.price
    );
    this.data.totalValidContribution.inCollateral +=
      adjustedValidContribution;
    this.data.totalValidContribution.inDollar += this.toDollar(
      adjustedValidContribution,
      this.config.price
    );

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
        contribution: {
          inCollateral: contribution,
          inDollar: this.toDollar(contribution, this.config.price),
        },
        transactions: [{ transactionHash, contribution }],
      };
    } else {
      this.data.participants[participant].contribution.inCollateral +=
        contribution;
      this.data.participants[participant].contribution.inDollar +=
        this.toDollar(contribution, this.config.price);
      this.data.participants[participant].transactions.push({
        transactionHash,
        contribution,
      });
    }
    this.data.totalContribution.inCollateral += contribution;
    this.data.totalContribution.inDollar += this.toDollar(
      contribution,
      this.config.price
    );
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

  getAdjustedIndividualLimit(participant) {
    // if it's an early access round, return the adjustedIndividualLimit
    // which is based on the defined individual limti per batch and all contributions
    // that have been made previously by the participant
    if (this.config.isEarlyAccess) {
      // has the participant already contributed?
      const previousContribution =
        this.data.aggregatedPreviousContributions[participant];

      if (previousContribution) {
        const collateralAmount = previousContribution.inCollateral;
        const inCollateral =
          this.config.limits.individualLimit.inCollateral -
          collateralAmount;
        const inDollar = this.toDollar(
          inCollateral,
          this.config.price
        );
        return { inDollar, inCollateral };
      } else {
        return {
          inCollateral: this.toCollateral(
            this.config.limits.individualLimit.inDollar,
            this.config.price
          ),
          inDollar: this.config.limits.individualLimit.inDollar,
        };
      }

      // if it is not an early access round the rules are different
    } else if (!this.config.isEarlyAccess) {
      // if all total aggregated valid contribution is less than the total limit
      // the individual can contribute up to `LIMIT` (=> can contribute more)
      if (
        this.data.totalValidContribution.inCollateral <
        this.config.limits.totalLimit.inCollateral
      ) {
        return {
          inDollar: this.config.limits.individualLimit.inDollar,
          inCollateral: this.toCollateral(
            this.config.limits.individualLimit.inDollar,
            this.config.price
          ),
        };
      } else {
        // if the "soft total limit has been reached", the individual limit is lowered to `LIMIT_2`
        return {
          inCollateral: this.toCollateral(
            this.config.limits.individualLimit2.inDollar,
            this.config.price
          ),
          inDollar: this.config.limits.individualLimit2.inDollar,
        };
      }
    }
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

  // HELPERS
  toDollar(amount, price) {
    const amountReadable = parseFloat(formatUnits(amount, 18));
    return amountReadable * price;
  }

  toCollateral(dollarAmount, price) {
    const collateralAmountReadable =
      parseFloat(dollarAmount) / parseFloat(price);
    return parseUnits(collateralAmountReadable.toString(), 18);
  }
}
