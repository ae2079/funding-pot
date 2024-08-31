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
  const contr1 = 3000000000000000000n;
  const contr2 = 4000000000000000000n;
  const contr3 = 5000000000000000000n;
  const contr4 = 6000000000000000000n;
  const contr5 = 7000000000000000000n;

  describe('#calculateAggregateContributions', () => {
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
    batchService.addInflows(dataWithEligibility);

    it('adds aggregate contribution data', () => {
      batchService.calculateAggregateContributions(
        dataWithEligibility
      );

      assert.deepStrictEqual(batchService.data, {
        totalValidContributions: contr1 + contr2 + contr3,
        totalExcessContributions: contr4 + contr5,
        participants: dataWithEligibility,
      });
    });
  });

  describe('#checkEligibility', () => {
    const eligibleAddresses = [addr1, addr2];
    const nonEligibleAddress = addr3;
    const data = {
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
    batchService.addInflows(data);

    it('adds `permitted` flag per participant', () => {
      batchService.checkEligibility(eligibleAddresses);

      assert.deepStrictEqual(batchService.data, {
        participants: {
          [eligibleAddresses[0]]: {
            contribution: data[eligibleAddresses[0]].contribution,
            permitted: true,
          },
          [eligibleAddresses[1]]: {
            contribution: data[eligibleAddresses[1]].contribution,
            permitted: true,
          },
          [nonEligibleAddress]: {
            contribution: data[nonEligibleAddress].contribution,
            permitted: false,
          },
        },
      });
    });
  });

  describe('#getContributors', () => {
    const data = {
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
    batchService.addInflows(data);

    it("returns a list of contributors' addresses (`eligible` = true)", () => {
      const contributors = batchService.getContributors();

      assert.deepStrictEqual(contributors, [addr1, addr2]);
    });
  });

  describe('#calculateValidContributions', () => {
    const exAnteSupply = 100_000_000_000_000_000_000n;
    const exAnteBalances = {
      [addr1]: 1_000_000_000_000_000_000n, // can still buy one more token (= 1_000_000_000_000_000_000n)
      [addr2]: 1_000_000_000_000_000_000n, // can still buy one more token
      [addr3]: 2_000_000_000_000_000_000n, // has already exactly reached the cap
      [addr4]: 3_000_000_000_000_000_000n, // has already exceeded the cap
      [addr5]: 1_000_000_000_000_000_000n, // can still buy one more token
      [addr6]: 1_000_000_000_000_000_000n, // can still buy one more token
    };
    const exAnteSpotPrice = 500000n;

    const data = {
      participants: {
        [addr1]: {
          contribution: 5_000_000_000_000_000_000n, // matches exactly what can be bought
          permitted: true,
        },
        [addr2]: {
          contribution: 69_000_000_000_000_000_000n, // purchase will exceed cap by far
          permitted: true,
        },
        [addr3]: {
          contribution: 420_000_000_000_000_000_000n, // purchase would exceed cap by far
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
      batchService.calculateValidContributions(
        exAnteSupply,
        exAnteSpotPrice,
        exAnteBalances
      );
    });

    it('adds fields `exAnteSupply`, `exAnteSpotPrice`, `cap`', () => {
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
        const { participants, cap } = batchService.data;
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

    describe('when contributor has exactly reached cap ex ante (addr3)', () => {
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

    describe('when contributor has already exceeded cap ex ante (addr4)', () => {
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

  describe('#calculateAllocations', () => {
    const additionalIssuance = 100_000_000_000_000_000_000n;
    const totalValidContributions = contr1 + contr2 + contr3;

    const data = {
      totalValidContributions,
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
      batchService.calculateAllocations(additionalIssuance);

      const { participants, totalValidContributions } =
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

  describe('#addVestingSpecs', () => {});

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
});
