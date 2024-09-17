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
  describe.skip('#calcValidContributions', () => {
    const totalLimit = 24_000_000_000_000_000_000n; // 24
    const individualLimit = 6_000_000_000_000_000_000n; // 6

    const exAnteContributions = {
      [addr1]: 1_000_000_000_000_000_000n, // can still buy one more token (= 1_000_000_000_000_000_000n)
      [addr2]: 1_000_000_000_000_000_000n, // can still buy one more token
      [addr3]: 2_000_000_000_000_000_000n, // has already exactly reached the CAP
      [addr4]: 3_000_000_000_000_000_000n, // has already exceeded the CAP
      [addr5]: 1_000_000_000_000_000_000n, // can still buy one more token
      [addr6]: 1_000_000_000_000_000_000n, // can still buy one more token
    };

    const data = {
      participants: {
        [addr1]: {
          contribution: individualLimit, // matches exactly what can be bought
          permitted: true,
        },
        [addr2]: {
          contribution: 69_000_000_000_000_000_000n, // purchase will exceed CAP by far
          permitted: true,
        },
        [addr3]: {
          contribution: 420_000_000_000_000_000_000n, // purchase would exceed CAP by far
          permitted: true,
        },
        [addr4]: {
          contribution: 2_000_000_000_000_000_000n,
          permitted: true,
        },
        [addr5]: {
          contribution: 2_000_000_000_000_000_000n,
          permitted: true,
        },
        [addr6]: {
          contribution: 2_000_000_000_000_000_000n,
          permitted: false,
        },
      },
    };

    const batchService = new Batch();
    batchService.data = data;

    beforeEach(() => {
      batchService.calcValidContributions(
        exAnteSupply,
        exAnteSpotPrice,
        exAnteBalances
      );
    });

    it('adds fields `totalContributionCap`, `individualContributionCap`', () => {
      const {
        exAnteSupply: receivedExAnteSupply,
        exAnteSpotPrice: receivedExAnteSpotPrice,
        issuanceTokenCap,
      } = batchService.data;
      assert.equal(receivedExAnteSupply, exAnteSupply);
      assert.equal(receivedExAnteSpotPrice, exAnteSpotPrice);
      assert.equal(issuanceTokenCap, 2_000_000_000_000_000_000n); // equals 2 tokens
    });

    describe('when contributor contributes exactly what they can contribute (addr1)', () => {
      it('adds field `validContribution` which equals `contribution`', () => {
        const { participants } = batchService.data;
        const {
          contribution,
          validContribution,
          excessContribution,
        } = participants[addr1];
        assert.equal(
          contribution,
          data.participants[addr1].contribution
        );
        assert.equal(contribution, validContribution);
        assert.strictEqual(excessContribution, undefined);
      });
    });

    describe('when contributor can still contribute but contributes too much', () => {
      it('adds fields `excessContribution` and `validContribution`', () => {
        const { participants, CAP } = batchService.data;
        const {
          contribution,
          excessContribution,
          validContribution,
        } = participants[addr2];
        assert.equal(excessContribution, 64_000_000_000_000_000_000n);
        assert.equal(contribution, 69_000_000_000_000_000_000n);
        assert.equal(validContribution, 5_000_000_000_000_000_000n);
      });
    });

    describe('when contributor has exactly reached CAP ex ante (addr3)', () => {
      it('adds field `excessContribution` which equals `contribution`', () => {
        const { participants } = batchService.data;
        const {
          contribution,
          excessContribution,
          validContribution,
        } = participants[addr3];
        assert.equal(
          contribution,
          data.participants[addr3].contribution
        );
        assert.equal(excessContribution, contribution);
        assert.strictEqual(validContribution, undefined);
      });
    });

    describe('when contributor has already exceeded CAP ex ante (addr4)', () => {
      it('adds field `excessContribution` which equals `contribution`', () => {
        const { participants } = batchService.data;
        const {
          contribution,
          excessContribution,
          validContribution,
        } = participants[addr4];
        assert.equal(
          contribution,
          data.participants[addr4].contribution
        );
        assert.equal(excessContribution, contribution);
        assert.strictEqual(validContribution, undefined);
      });
    });

    describe('when contributor contributes less than they could (addr5)', () => {
      it('adds field `validContribution` which equals `contribution`', () => {
        const { participants } = batchService.data;
        const {
          contribution,
          excessContribution,
          validContribution,
        } = participants[addr5];
        assert.equal(
          contribution,
          data.participants[addr5].contribution
        );
        assert.equal(contribution, validContribution);
        assert.strictEqual(excessContribution, undefined);
      });
    });

    describe('when contributor is not permitted to contribute (addr6)', () => {
      it('adds field `excessContribution` which equals `contribution`', () => {
        const { participants } = batchService.data;
        const {
          contribution,
          excessContribution,
          validContribution,
        } = participants[addr6];
        assert.equal(
          contribution,
          data.participants[addr6].contribution
        );
        assert.equal(excessContribution, contribution);
        assert.strictEqual(validContribution, undefined);
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

    it('returns the aggregated historical contributions per address', () => {
      assert.equal(
        batchService.data.participants[addr1].exAnteContribution,
        2n
      );
      assert.equal(
        batchService.data.participants[addr2].exAnteContribution,
        4n
      );
      assert.equal(
        batchService.data.participants[addr3].exAnteContribution,
        6n
      );
      assert.equal(
        batchService.data.participants[addr4].exAnteContribution,
        8n
      );
      assert.deepEqual(
        batchService.data.participants[addr5].exAnteContribution,
        undefined
      );
    });
  });
});
