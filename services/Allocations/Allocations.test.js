import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Allocations } from './Allocations.js';

describe('Allocations', () => {
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

  describe('#addContributionData', () => {
    const dataWithEligibility = {
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
      [addr4]: {
        contribution: contr4,
        permitted: false,
      },
    };
    const allocationsService = new Allocations(dataWithEligibility);

    it('adds aggregate contribution data', () => {
      allocationsService.addContributionData(dataWithEligibility);

      assert.deepStrictEqual(allocationsService.data, {
        totalContributions: 7000000000000000000n,
        totalReimbursements: 11000000000000000000n,
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
    const allocationsService = new Allocations(data);

    it('adds `permitted` flag per participant', () => {
      allocationsService.checkEligibility(eligibleAddresses);

      assert.deepStrictEqual(allocationsService.data, {
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

  describe('#calculateRawAllocations', () => {
    const totalAmountOut = 1234567789012345678900n;
    const totalAmountIn = 12000000000000000000n;
    const data = {
      totalContributions: totalAmountIn,
      newIssuance: totalAmountOut,
      participants: {
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
      },
    };
    const allocationsService = new Allocations();
    allocationsService.data = data;

    it('calculates allocations', () => {
      allocationsService.calculateRawAllocations(totalAmountOut);

      assert.deepStrictEqual(
        Object.values(allocationsService.data.participants)
          .filter((p) => p.permitted)
          .map((p) => p.rawIssuanceAllocation),
        [308641900000000000000n, 411522500000000000000n]
      );
    });
  });

  describe('#getContributors', () => {
    const data = {
      participants: {
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
      },
    };
    const allocationsService = new Allocations();
    allocationsService.data = data;

    it("returns a list of contributors' addresses (`eligible` = true)", () => {
      const contributors = allocationsService.getContributors();

      assert.deepStrictEqual(contributors, [addr1, addr2]);
    });
  });

  describe('#calculateActualContributions', () => {
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

    const allocationsService = new Allocations();
    allocationsService.data = data;

    beforeEach(() => {
      allocationsService.calculateActualContributions(
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
      } = allocationsService.data;
      assert.equal(receivedExAnteSupply, exAnteSupply);
      assert.equal(receivedExAnteSpotPrice, exAnteSpotPrice);
      assert.equal(issuanceTokenCap, 2_000_000_000_000_000_000n); // equals 2 tokens
    });

    describe('when contributor contributes exactly what they can contribute (addr1)', () => {
      it('adds field `actualContribution` which equals `contribution`', () => {
        const { participants } = allocationsService.data;
        const {
          contribution,
          actualContribution,
          excessContribution,
        } = participants[addr1];
        assert.equal(
          contribution,
          data.participants[addr1].contribution
        );
        assert.equal(contribution, actualContribution);
        assert.strictEqual(excessContribution, undefined);
      });
    });

    describe('when contributor can still contribute but contributes too much', () => {
      it('adds fields `excessContribution` and `actualContribution`', () => {
        const { participants, cap } = allocationsService.data;
        const {
          contribution,
          excessContribution,
          actualContribution,
        } = participants[addr2];
        assert.equal(excessContribution, 64_000_000_000_000_000_000n);
        assert.equal(contribution, 69_000_000_000_000_000_000n);
        assert.equal(actualContribution, 5_000_000_000_000_000_000n);
      });
    });

    describe('when contributor has exactly reached cap ex ante (addr3)', () => {
      it('adds field `excessContribution` which equals `contribution`', () => {
        const { participants } = allocationsService.data;
        const {
          contribution,
          excessContribution,
          actualContribution,
        } = participants[addr3];
        assert.equal(
          contribution,
          data.participants[addr3].contribution
        );
        assert.equal(excessContribution, contribution);
        assert.strictEqual(actualContribution, undefined);
      });
    });

    describe('when contributor has already exceeded cap ex ante (addr4)', () => {
      it('adds field `excessContribution` which equals `contribution`', () => {
        const { participants } = allocationsService.data;
        const {
          contribution,
          excessContribution,
          actualContribution,
        } = participants[addr4];
        assert.equal(
          contribution,
          data.participants[addr4].contribution
        );
        assert.equal(excessContribution, contribution);
        assert.strictEqual(actualContribution, undefined);
      });
    });

    describe('when contributor contributes less than they could (addr5)', () => {
      it('adds field `actualContribution` which equals `contribution`', () => {
        const { participants } = allocationsService.data;
        const {
          contribution,
          excessContribution,
          actualContribution,
        } = participants[addr5];
        assert.equal(
          contribution,
          data.participants[addr5].contribution
        );
        assert.equal(contribution, actualContribution);
        assert.strictEqual(excessContribution, undefined);
      });
    });

    describe('when contributor is not permitted to contribute (addr6)', () => {
      it('adds field `excessContribution` which equals `contribution`', () => {
        const { participants } = allocationsService.data;
        const {
          contribution,
          excessContribution,
          actualContribution,
        } = participants[addr6];
        assert.equal(
          contribution,
          data.participants[addr6].contribution
        );
        assert.equal(excessContribution, contribution);
        assert.strictEqual(actualContribution, undefined);
      });
    });
  });
});
