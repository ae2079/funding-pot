import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Batch } from './Batch.js';

describe('Batch', () => {
  const addr1 = '0x327f6bc1b86eca753bfd2f8187d22b6aef7783eb';
  const addr2 = '0x932285a2e33b89981d25eb586a3893e0f5a1a9da';
  const addr3 = '0x4ffe42c1666e50104e997DD07E43c673FD39C81d';
  const addr4 = '0x3bc66727a37f7c0e1039540e3dc2254d39f420ff';
  const addr5 = '0x6bc66727a37f7c0e1039540e3dc2254d39f420eb';
  const addr6 = '0x27276727a37f7c0e1039540e3dc2254d39f42027';
  const contr1 = 3_000_000_000_000_000_000n;
  const contr2 = 4_000_000_000_000_000_000n;
  const contr3 = 5_000_000_000_000_000_000n;
  const contr4 = 6_000_000_000_000_000_000n;
  const contr5 = 7_000_000_000_000_000_000n;

  describe('#constructor', () => {
    it('sets `totalCap` and `individualCap` in `data`', () => {
      const batchService = new Batch(1n, 2n);
      assert.deepStrictEqual(Object.entries(batchService), [
        [
          'data',
          {
            totalCap: 1n,
            individualCap: 2n,
          },
        ],
      ]);
    });
  });

  describe('#aggregateContributions', () => {
    const dataWithEligibility = {
      [addr1]: {
        validContribution: contr1,
      },
      [addr2]: {
        validContribution: contr2,
      },
      [addr3]: {
        validContribution: contr3,
        excessContribution: contr4,
      },
      [addr4]: {
        excessContribution: contr5,
      },
    };
    const batchService = new Batch();
    batchService.data.participants = dataWithEligibility;

    it('adds aggregate contribution data', () => {
      batchService.aggregateContributions(dataWithEligibility);

      assert.deepStrictEqual(batchService.data, {
        totalCap: undefined,
        individualCap: undefined,
        totalValidContribution: contr1 + contr2 + contr3,
        totalExcessContribution: contr4 + contr5,
        participants: dataWithEligibility,
      });
    });
  });

  describe('#checkEligibility', () => {
    const eligibleAddresses = [addr1, addr2];
    const nonEligibleAddress = addr3;
    const participants = {
      [eligibleAddresses[0]]: {
        contribution: contr1,
      },
      [eligibleAddresses[1]]: {
        contribution: contr2,
      },
      [nonEligibleAddress]: {
        contribution: contr3,
      },
    };
    const batchService = new Batch();

    beforeEach(() => {
      batchService.checkEligibility(participants, eligibleAddresses);
    });

    it('adds `permitted` flag per participant', () => {
      assert.deepStrictEqual(batchService.data.participants, {
        [eligibleAddresses[0]]: {
          contribution:
            participants[eligibleAddresses[0]].contribution,
          permitted: true,
        },
        [eligibleAddresses[1]]: {
          contribution:
            participants[eligibleAddresses[1]].contribution,
          permitted: true,
        },
        [nonEligibleAddress]: {
          contribution: participants[nonEligibleAddress].contribution,
          permitted: false,
        },
      });
    });

    it('adds field `totalEligibleContributions`', () => {
      assert.equal(
        batchService.data.totalEligibleContributions,
        contr1 + contr2
      );
    });
  });

  describe('#getContributors', () => {
    const participants = {
      [addr1]: {
        contribution: contr1,
        permitted: true,
      },
      [addr2]: {
        contribution: contr2,
        permitted: true,
      },
      [addr3]: {
        contribution: contr3,
        permitted: false,
      },
    };
    const batchService = new Batch();
    batchService.data.participants = participants;

    it("returns a list of contributors' addresses (`eligible` = true)", () => {
      const contributors = batchService.getContributors();

      assert.deepStrictEqual(contributors, [addr1, addr2]);
    });
  });

  // TODO
  describe('#assessInflows', () => {
    const totalCap = 24_000_000_000_000_000_000n; // 24
    const individualCap = 6_000_000_000_000_000_000n; // 6
    const allowlist = [addr1, addr2, addr4, addr5, addr6];

    const inflows = [
      {
        participant: addr1,
        contribution: individualCap, // matches exactly what can be bought
        timestamp: 1725654698,
      },
      {
        participant: addr2,
        contribution: individualCap + 1n, // exceeds individual limit
        timestamp: 1725654766,
      },
      {
        participant: addr1,
        contribution: 1n, // exceeds limit for addr1 (cause it's second contribution)
        timestamp: 1725654780,
      },
      {
        participant: addr3, // not on allowlist
        contribution: 1n,
        timestamp: 1725654794,
      },
      {
        participant: addr4,
        contribution: totalCap, // exceeds both individual and total cap (individual cap is more restrictive here)
        timestamp: 1725654795,
      },
      {
        participant: addr5,
        contribution: contr2, // valid contribution
        timestamp: 1725654796,
      },
      {
        participant: addr3, // still not on allowlist
        contribution: 1n,
        timestamp: 1725654797,
      },
      {
        participant: addr6,
        contribution: contr5, // exceeds both individual and total cap (total cap is more restrictive here)
        timestamp: 1725654797,
      },
    ];

    const batchService = new Batch();
    batchService.data = {
      totalCap,
      individualCap,
    };

    beforeEach(() => {
      batchService.assessInflows(inflows, allowlist);
    });

    it('adds fields `totalContribution`, `totalValidContribution`, `totalExcessContribution` and `participants`', () => {
      assert.deepStrictEqual(Object.keys(batchService.data), [
        'totalCap',
        'individualCap',
        'totalContribution',
        'totalValidContribution',
        'totalExcessContribution',
        'participants',
      ]);
    });

    it('calculates the correct `totalValidContribution`', () => {
      assert.equal(
        batchService.data.totalValidContribution,
        totalCap
      );
    });

    it('calculates the correct `totalContribution`', () => {
      assert.equal(
        batchService.data.totalContribution,
        inflows.reduce((acc, curr) => acc + curr.contribution, 0n)
      );
    });

    it('calculates the correct `excessContribution`', () => {
      assert.equal(
        batchService.data.totalExcessContribution,
        inflows.reduce((acc, curr) => acc + curr.contribution, 0n) -
          totalCap
      );
    });

    describe('with two contributions (addr1)', () => {
      const contributor = addr1;

      describe('when when the second contribution exceeds the individual cap', () => {
        it('splits between `validContribution` and `excessContribution`', () => {
          const { participants } = batchService.data;
          const {
            contribution,
            excessContribution,
            validContribution,
          } = participants[contributor];

          assert.equal(
            contribution,
            inflows[0].contribution + inflows[2].contribution
          );
          assert.equal(excessContribution, inflows[2].contribution);
          assert.equal(validContribution, inflows[0].contribution);
        });
      });
    });

    describe('with one contribution (addr2)', () => {
      const contributor = addr2;

      describe('when contributor contributes above individual limit', () => {
        it('splits between `validContribution` and `excessContribution`', () => {
          const { participants } = batchService.data;
          const {
            contribution,
            excessContribution,
            validContribution,
          } = participants[contributor];

          assert.equal(contribution, inflows[1].contribution);
          assert.equal(
            excessContribution,
            inflows[1].contribution - individualCap
          );
          assert.equal(validContribution, individualCap);
        });
      });
    });

    describe('without being on the allowlist (addr3)', () => {
      const contributor = addr3;

      it('considers all contributions as `excessContribution`', () => {
        const { participants } = batchService.data;
        const {
          contribution,
          excessContribution,
          validContribution,
        } = participants[contributor];

        assert.equal(contribution, 2n);
        assert.equal(excessContribution, 2n);
        assert.equal(validContribution, 0n);
      });
    });

    describe('without any applicable restrictions (addr5)', () => {
      const contributor = addr5;

      it('counts the contribution as valid', () => {
        const { participants } = batchService.data;
        const {
          contribution,
          excessContribution,
          validContribution,
        } = participants[contributor];

        assert.equal(contribution, contr2);
        assert.equal(excessContribution, 0n);
        assert.equal(validContribution, contr2);
      });
    });

    describe('when contribution exceeds both individual and total cap', () => {
      describe('where the total cap is more restrictive (addr6)', () => {
        const contributor = addr6;

        it('counts the contribution as valid', () => {
          const { participants } = batchService.data;
          const {
            contribution,
            excessContribution,
            validContribution,
          } = participants[contributor];

          assert.equal(contribution, 7000000000000000000n);
          assert.equal(excessContribution, 5000000000000000000n);
          assert.equal(validContribution, 2000000000000000000n);
        });
      });

      describe('where the individual cap is more restrictive (addr4)', () => {
        const contributor = addr4;

        it("only considers the contribution that doesn't exceed the total cap as valid", () => {
          const { participants } = batchService.data;
          const {
            contribution,
            excessContribution,
            validContribution,
          } = participants[contributor];

          assert.equal(contribution, totalCap);
          assert.equal(excessContribution, totalCap - individualCap);
          assert.equal(validContribution, individualCap);
        });
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
          excessContribution: contr4,
        },
      },
    };

    const batchService = new Batch();
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
          excessContribution: contr3,
        },
      },
    };
    const batchService = new Batch();
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

  describe('#calcValidExAnteContributions', () => {
    const data = {
      participants: {
        [addr1]: {
          validContribution: 1n,
          permitted: true,
        },
        [addr2]: {
          validContribution: 2n,
          permitted: true,
        },
        [addr3]: {
          validContribution: 3n,
          permitted: true,
        },
        [addr4]: {
          validContribution: 4n,
          permitted: true,
        },
        [addr5]: {
          contribution: 5n,
          permitted: false,
        },
      },
    };

    const reports = {
      1: { batch: data },
      2: {
        batch: {
          participants: {
            ...data.participants,
            [addr6]: {
              validContribution: 6n,
              permitted: true,
            },
          },
        },
      },
    };

    const batchService = new Batch();
    batchService.data = data;

    beforeEach(() => {
      batchService.calcValidExAnteContributions(reports);
    });

    it('stores the total historical contributions', () => {
      assert.equal(
        batchService.data.exAnteTotalValidContributions,
        26n
      );
    });
  });
});
