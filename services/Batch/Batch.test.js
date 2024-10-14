import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { formatUnits, parseUnits } from 'viem';

import { Batch } from './Batch.js';
import {
  inflows,
  addresses,
  allowlist,
  batchConfig,
  nftHolders,
} from '../../utils/testUtils/staticTestData.js';
import { getDollarDenominated } from '../../utils/testUtils/testHelpers.js';

describe('Batch', () => {
  const addr1 = '0x6747772f37a4f7cfdea180d38e8ad372516c9548';
  const addr2 = '0xa6e12ede427516a56a5f6ab6e06dd335075eb04b';
  const addr3 = '0xcb1edf0e617c0fab6408701d58b746451ee6ce2f';
  const addr4 = '0xb4f8d886e9e831b6728d16ed7f3a6c27974abaa4';
  const contr1 = 3_000_000_000_000_000_000n;
  const contr2 = 4_000_000_000_000_000_000n;
  const contr3 = 5_000_000_000_000_000_000n;
  const contr4 = 6_000_000_000_000_000_000n;

  const collateralDenominatedTotalLimit = parseUnits(
    (
      parseFloat(batchConfig.LIMITS.TOTAL) *
      parseFloat(batchConfig.PRICE)
    ).toString(),
    18
  );
  const collateralDenominatedTotalLimit2 = parseUnits(
    (
      parseFloat(batchConfig.LIMITS.TOTAL_2) *
      parseFloat(batchConfig.PRICE)
    ).toString(),
    18
  );
  const collateralDenominatedIndividualLimit = parseUnits(
    (
      parseFloat(batchConfig.LIMITS.INDIVIDUAL) *
      parseFloat(batchConfig.PRICE)
    ).toString(),
    18
  );

  describe('#constructor', () => {
    describe('always', () => {
      const batchService = new Batch({ batchConfig });

      it('sets the correct keys in the config object', () => {
        assert.deepStrictEqual(Object.keys(batchService.config), [
          'totalLimit',
          'totalLimit2',
          'individualLimit',
          'individualLimit2',
          'isEarlyAccess',
          'price',
        ]);
      });
    });

    describe('without previous batchReports', () => {
      const batchService = new Batch({ batchConfig });

      it('sets `totalLimit` and `individualLimit` in `data` to be equal to config inputs', () => {
        assert.equal(
          batchService.config.totalLimit,
          parseUnits(
            (
              parseFloat(batchConfig.LIMITS.TOTAL) *
              parseFloat(batchConfig.PRICE)
            ).toString(),
            18
          )
        );
        assert.equal(
          batchService.config.totalLimit2,
          parseUnits(
            (
              parseFloat(batchConfig.LIMITS.TOTAL_2) *
              parseFloat(batchConfig.PRICE)
            ).toString(),
            18
          )
        );
        assert.equal(
          batchService.config.individualLimit,
          collateralDenominatedIndividualLimit
        );
      });
    });

    describe('with previous batchReports', () => {
      const user1Contr1 = parseUnits('0.1', 18);
      const user1Contr2 = parseUnits('0.2', 18);
      const user2Contr2 = parseUnits('0.4', 18);

      const mockBatchReports = {
        1: {
          totalValidContribution: parseUnits('3', 18),
          participants: {
            [addr1]: {
              validContribution: user1Contr1,
            },
          },
        },
        2: {
          totalValidContribution: parseUnits('2', 18),
          participants: {
            [addr1]: {
              validContribution: user1Contr2,
            },
            [addr2]: { validContribution: user2Contr2 },
          },
        },
      };

      const batchService = new Batch({
        batchConfig,
        batchReports: mockBatchReports,
      });

      it('adjusts the totalLimit1', () => {
        assert.equal(
          batchService.config.totalLimit,
          collateralDenominatedTotalLimit -
            mockBatchReports[1].totalValidContribution -
            mockBatchReports[2].totalValidContribution
        );
      });

      it('adjusts the totalLimit2', () => {
        assert.equal(
          batchService.config.totalLimit2,
          collateralDenominatedTotalLimit2 -
            mockBatchReports[1].totalValidContribution -
            mockBatchReports[2].totalValidContribution
        );
      });

      it('adds aggregated previous contributions to `data`', () => {
        assert.deepStrictEqual(
          batchService.data.aggregatedPreviousContributions,
          {
            [addr1]: user1Contr1 + user1Contr2,
            [addr2]: user2Contr2,
          }
        );
      });
    });
  });

  describe('#assessInflows', () => {
    const { addr1, addr2, addr3, addr4, addr5, addr6 } = addresses;
    const totalLimit = collateralDenominatedTotalLimit2;
    const individualLimit = collateralDenominatedIndividualLimit;

    describe('when it is NOT an early access batch', () => {
      const batchService = new Batch({
        batchConfig,
      });

      beforeEach(() => {
        batchService.assessInflows(inflows, allowlist, nftHolders);
      });

      it('adds fields `totalContribution`, `totalValidContribution`, `totalInvalidContribution` and `participants`', () => {
        assert.deepStrictEqual(Object.keys(batchService.data), [
          'aggregatedPreviousContributions',
          'totalContribution',
          'totalValidContribution',
          'totalInvalidContribution',
          'participants',
        ]);
      });

      it('adds the transactions to the participants', () => {
        const participantAddresses = Object.values(addresses);

        for (const addr of participantAddresses) {
          const { transactions } =
            batchService.data.participants[addr];
          const participantInflowTxs = inflows
            .filter((i) => i.participant === addr)
            .map((i) => i.transactionHash);
          assert.deepStrictEqual(
            participantInflowTxs,
            transactions.map((t) => t.transactionHash)
          );
        }
      });

      it('calculates the correct `totalValidContribution`', () => {
        assert.equal(
          batchService.data.totalValidContribution,
          totalLimit
        );
      });

      it('calculates the correct `totalContribution`', () => {
        assert.equal(
          batchService.data.totalContribution,
          inflows.reduce((acc, curr) => acc + curr.contribution, 0n)
        );
      });

      it('calculates the correct `invalidContribution`', () => {
        assert.equal(
          batchService.data.totalInvalidContribution,
          inflows.reduce((acc, curr) => acc + curr.contribution, 0n) -
            totalLimit
        );
      });

      describe('with two contributions (addr1)', () => {
        const contributor = addr1;

        describe('when the second contribution exceeds the individual cap', () => {
          describe('without any previous contributions', () => {
            it('splits correctly between `validContribution` and `invalidContribution`', () => {
              const { participants } = batchService.data;
              const {
                contribution,
                invalidContribution,
                validContribution,
              } = participants[contributor];

              assert.equal(
                contribution,
                inflows[0].contribution + inflows[2].contribution
              );
              assert.equal(
                invalidContribution,
                inflows[2].contribution
              );
              assert.equal(
                validContribution,
                inflows[0].contribution
              );
            });
          });

          describe('with previous contributions', () => {
            const user1Contr1 = 1n;
            const user1Contr2 = 2n;

            const mockBatchReports = {
              1: {
                totalValidContribution: 0n,
                participants: {
                  [addr1]: {
                    validContribution: user1Contr1,
                  },
                },
              },
              2: {
                totalValidContribution: 0n,
                participants: {
                  [addr1]: {
                    validContribution: user1Contr2,
                  },
                },
              },
            };

            it('accounts for previous contributions when splitting between valid and invalid', () => {
              const batchServiceWithPrevIndContribs = new Batch({
                batchConfig: {
                  ...batchConfig,
                  IS_EARLY_ACCESS: true,
                },
                batchReports: mockBatchReports,
              });
              batchServiceWithPrevIndContribs.assessInflows(
                inflows,
                allowlist,
                nftHolders
              );

              const { participants } =
                batchServiceWithPrevIndContribs.data;
              const {
                contribution,
                invalidContribution,
                validContribution,
              } = participants[contributor];

              assert.equal(
                contribution,
                inflows[0].contribution + inflows[2].contribution
              );
              assert.equal(
                invalidContribution,
                inflows[2].contribution + user1Contr1 + user1Contr2
              );
              assert.equal(
                validContribution,
                inflows[0].contribution - user1Contr1 - user1Contr2
              );
            });
          });
        });
      });

      describe('with one contribution (addr2)', () => {
        const contributor = addr2;

        describe('when contributor contributes above individual limit', () => {
          it('splits between `validContribution` and `invalidContribution`', () => {
            const { participants } = batchService.data;
            const {
              contribution,
              invalidContribution,
              validContribution,
            } = participants[contributor];

            assert.equal(contribution, inflows[1].contribution);
            assert.equal(
              invalidContribution,
              inflows[1].contribution - individualLimit
            );
            assert.equal(validContribution, individualLimit);
          });
        });
      });

      describe('without being on the allowlist (addr3)', () => {
        const contributor = addr3;

        it('considers all contributions as `invalidContribution`', () => {
          const { participants } = batchService.data;
          const {
            contribution,
            invalidContribution,
            validContribution,
          } = participants[contributor];

          assert.equal(contribution, 100000000000000000n);
          assert.equal(invalidContribution, 100000000000000000n);
          assert.equal(validContribution, 0n);
        });
      });

      describe('without any applicable restrictions (addr5)', () => {
        const contributor = addr5;

        it('counts the contribution as valid', () => {
          const { participants } = batchService.data;
          const {
            contribution,
            invalidContribution,
            validContribution,
          } = participants[contributor];

          assert.equal(contribution, 1700000000000000000n);
          assert.equal(invalidContribution, 0n);
          assert.equal(validContribution, 1700000000000000000n);
        });
      });

      describe('when contribution exceeds both individual and total cap', () => {
        describe('where the total cap is more restrictive (addr6)', () => {
          const contributor = addr6;

          it('adhers to the total cap (TOTAL_2)', () => {
            const { participants, totalValidContribution } =
              batchService.data;
            const {
              contribution,
              invalidContribution,
              validContribution,
            } = participants[contributor];

            assert.equal(contribution, inflows[6].contribution);
            assert.equal(invalidContribution, parseUnits('1.7', 18));
            assert.equal(validContribution, parseUnits('1.3', 18));
            assert.equal(
              totalValidContribution,
              getDollarDenominated(
                batchConfig.LIMITS.TOTAL_2,
                batchConfig.PRICE
              )
            );
          });
        });

        describe('where the individual cap is more restrictive (addr4)', () => {
          const contributor = addr4;

          it('adhers to the individual cap', () => {
            const { participants } = batchService.data;
            const {
              contribution,
              invalidContribution,
              validContribution,
            } = participants[contributor];

            assert.equal(contribution, totalLimit);
            assert.equal(
              invalidContribution,
              totalLimit - individualLimit
            );
            assert.equal(validContribution, individualLimit);
          });
        });
      });

      describe.only('when only the soft cap has been reached', () => {
        const excess = 69n;
        const customBatchConfig = {
          TIMEFRAME: {
            FROM_TIMESTAMP: 1726684518,
            TO_TIMESTAMP: 1726692378,
          },
          LIMITS: {
            TOTAL: '89',
            TOTAL_2: '90',
            INDIVIDUAL: '89',
            INDIVIDUAL_2: '0.5',
          },
          IS_EARLY_ACCESS: false,
          PRICE: '0.1',
        };
        const customInflows = [
          {
            participant: addresses.addr1,
            contribution: getDollarDenominated(
              customBatchConfig.LIMITS.TOTAL,
              customBatchConfig.PRICE
            ),
            timestamp: 1726691908,
            transactionHash:
              '0x7d5b14cc482d201ef6b0803bc2fefeab805951e6d04817f64dc9ba35b9094ae0',
          },
          {
            participant: addresses.addr2,
            contribution:
              getDollarDenominated(
                customBatchConfig.LIMITS.INDIVIDUAL_2,
                customBatchConfig.PRICE
              ) + excess,
            timestamp: 1726691938,
            transactionHash:
              '0x81bfc33fab4d3507f859e6b2593029752318f8790ac9109a8b1ebdf79d5ec38d',
          },
        ];

        it('counts everything exceeding INDIVIDUAL_2 as invalid contribution', () => {
          const customBatchService = new Batch({
            batchConfig: {
              ...customBatchConfig,
            },
          });
          customBatchService.assessInflows(
            customInflows,
            [addresses.addr1, addresses.addr2],
            []
          );
          assert.equal(
            customBatchService.data.participants[addr2]
              .invalidContribution,
            excess
          );
        });
      });
    });

    describe('when it is an early access batch', () => {
      const batchService = new Batch({
        batchConfig: { ...batchConfig, IS_EARLY_ACCESS: true },
      });

      beforeEach(() => {
        batchService.assessInflows(inflows, allowlist, nftHolders);
      });

      it('includes only valid contributions from NFT holders', () => {
        const { participants } = batchService.data;
        const participantsWithValidContributions = Object.entries(
          participants
        )
          .filter(([, data]) => data.validContribution > 0n)
          .map(([address]) => address);
        assert.deepStrictEqual(
          participantsWithValidContributions,
          nftHolders
        );
      });
    });
  });

  describe('#calcAllocations', () => {
    const additionalIssuance = 100_000_000_000_000_000_000n;
    const totalValidContribution = contr1 + contr2 + contr3;

    const data = {
      totalValidContribution,
      additionalIssuance,
      participants: {
        [addr1]: {
          validContribution: contr1,
        },
        [addr2]: {
          validContribution: contr2,
        },
        [addr3]: {
          validContribution: contr3,
        },
        [addr4]: {
          invalidContribution: contr4,
        },
      },
    };

    const batchService = new Batch({
      batchConfig,
    });
    batchService.data = data;

    it('adds an `issuanceAllocation` field containing the allocation for each contributor', () => {
      batchService.calcAllocations(additionalIssuance);

      const { participants, totalValidContribution } =
        batchService.data;

      assert.equal(
        participants[addr1].issuanceAllocation,
        25000000000000000000n // without decimals: 3 / 12 * 100 = 25
      );
      assert.equal(
        participants[addr2].issuanceAllocation,
        33333300000000000000n // without decimals: 4 / 12 * 100 = 33.3333 (rounded down)
      );
      assert.equal(
        participants[addr3].issuanceAllocation,
        41666600000000000000n // without decimals: 5 / 12 * 100 = 41.6666 (rounded down)
      );
    });
  });

  describe('#getAllocations', () => {
    const data = {
      participants: {
        [addr1]: {
          issuanceAllocation: contr1,
        },
        [addr2]: {
          issuanceAllocation: contr2,
        },
        [addr3]: {
          invalidContribution: contr3,
        },
      },
    };
    const batchService = new Batch({
      batchConfig,
    });
    batchService.data = data;

    it('returns an object with the addresses as keys and their allocations as values', () => {
      const allocations = batchService.getAllocations();
      assert.deepStrictEqual(allocations, [
        {
          recipient: addr1,
          amount: contr1,
        },
        {
          recipient: addr2,
          amount: contr2,
        },
      ]);
    });
  });

  describe('#getApplicableTotalLimit', () => {
    describe("when it's an early access round", () => {
      it('returns the total limit', () => {
        const batchService = new Batch({
          batchConfig,
        });

        assert.equal(
          batchService.getApplicableTotalLimit({
            ...batchConfig,
            IS_EARLY_ACCESS: true,
          }),
          parseUnits(
            (
              parseFloat(batchConfig.LIMITS.TOTAL) *
              parseFloat(batchConfig.PRICE)
            ).toString(),
            18
          )
        );
      });
    });

    describe("when it's a QACC round", () => {
      it('returns the `TOTAL_LIMIT_2`', () => {
        const batchService = new Batch({
          batchConfig,
        });

        assert.equal(
          batchService.getApplicableTotalLimit({
            ...batchConfig,
            IS_EARLY_ACCESS: false,
          }),
          parseUnits(
            (
              parseFloat(batchConfig.LIMITS.TOTAL_2) *
              parseFloat(batchConfig.PRICE)
            ).toString(),
            18
          )
        );
      });
    });
  });

  describe('#getApplicableIndividualLimit', () => {
    describe('when it is an early access round', () => {
      it('returns the adjusted individual limit', () => {
        const batchService = new Batch({
          batchConfig: { ...batchConfig, IS_EARLY_ACCESS: true },
        });

        assert.equal(
          batchService.getApplicableIndividualLimit(addr1),
          parseUnits(
            (
              parseFloat(batchConfig.LIMITS.INDIVIDUAL) *
              parseFloat(batchConfig.PRICE)
            ).toString(),
            18
          )
        );
      });
    });

    describe('when it is not an early access round', () => {
      describe('when `TOTAL` has not been reached', () => {
        it('returns the fixed individual limit `INDIVIDUAL`', () => {
          const batchService = new Batch({
            batchConfig: { ...batchConfig, IS_EARLY_ACCESS: false },
          });
          batchService.data.totalValidContribution = parseUnits(
            '0.00001',
            18
          );
          assert.equal(
            batchService.getApplicableIndividualLimit(addr1),
            parseUnits(
              (
                parseFloat(batchConfig.LIMITS.INDIVIDUAL) *
                parseFloat(batchConfig.PRICE)
              ).toString(),
              18
            )
          );
        });
      });

      describe('when `TOTAL` has been exceeded', () => {
        it('returns the fixed individual limit `INDIVIDUAL_2`', () => {
          const batchService = new Batch({
            batchConfig: { ...batchConfig, IS_EARLY_ACCESS: false },
          });
          batchService.data.totalValidContribution = parseUnits(
            (
              parseFloat(batchConfig.LIMITS.TOTAL) *
              parseFloat(batchConfig.PRICE)
            ).toString(),
            18
          );

          assert.equal(
            batchService.getApplicableIndividualLimit(addr1),
            parseUnits(
              (
                parseFloat(batchConfig.LIMITS.INDIVIDUAL_2) *
                parseFloat(batchConfig.PRICE)
              ).toString(),
              18
            )
          );
        });
      });
    });
  });
});
