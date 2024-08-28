import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Allocations } from './Allocations.js';

describe('Allocations', () => {
  const addr1 = '0x327f6bc1b86eca753bfd2f8187d22b6aef7783eb';
  const addr2 = '0x932285a2e33b89981d25eb586a3893e0f5a1a9da';
  const addr3 = '0x4ffe42c1666e50104e997DD07E43c673FD39C81d';
  const addr4 = '0x3bc66727a37f7c0e1039540e3dc2254d39f420ff';
  const contr1 = 3000000000000000000n;
  const contr2 = 4000000000000000000n;
  const contr3 = 5000000000000000000n;
  const contr4 = 6000000000000000000n;

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

    it('adds aggregate contribution data', () => {
      const allocationsService = new Allocations(dataWithEligibility);
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

    it('adds `permitted` flag per participant', () => {
      const allocationsService = new Allocations(data);
      allocationsService.checkEligibility(eligibleAddresses);

      console.log(allocationsService.data);

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
      totalIssuance: totalAmountOut,
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

    it('calculates allocations', () => {
      const allocationsService = new Allocations();
      allocationsService.data = data;
      allocationsService.calculateRawAllocations();
      assert.deepStrictEqual(
        Object.values(allocationsService.data.participants).map(
          (p) => p.rawIssuanceAllocation
        ),
        [
          308641900000000000000n,
          411522500000000000000n,
          514403200000000000000n,
        ]
      );
    });
  });
});

// const FundingPot = new FundingPot({
//   rpcUrl: opSepoliaRpcUrl,
//   indexerUrl,
//   chainId,
//   multisigAddress,
//   blockExplorerUrl: opSepliaBlockExplorerUrl,
//   nftContractAddress,
//   bondingCurveAddress,
//   isPrivate: false,
// });
//   describe('#enrichInflowData', () => {
//     it('should return enriched inflow data', async () => {
// const inflows = {
//   '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe':
//     266076010000000n,
//   '0x6609384111b3644628b8865050cda1ebf8d85bbd':
//     150140000000000n,
//   '0x1778b55d436b3266a17d022a01145b3e91cbdd2b':
//     460539340000000n,
// };
//       const newSupply = 1000000000000000000n;
//       const enrichedData = await FundingPot.enrichInflowData(
//         inflows,
//         newSupply
//       );
//       assert.deepStrictEqual(enrichedData, [
//         [
//           '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe',
//           {
//             contribution: 266076010000000n,
//             relBalance: 0.00026607601,
//           },
//         ],
//         [
//           '0x6609384111b3644628b8865050cda1ebf8d85bbd',
//           { contribution: 150140000000000n, relBalance: 0.00015014 },
//         ],
//         [
//           '0x1778b55d436b3266a17d022a01145b3e91cbdd2b',
//           {
//             contribution: 460539340000000n,
//             relBalance: 0.00046053934,
//           },
//         ],
//       ]);
//     });
//   });

//   describe('#getAllocations', () => {
//     it('returns issuance allocations for a given set of contribution inflows', async () => {
//       const inflows = {
//         '0x327f6bc1b86eca753bfd2f8187d22b6aef7783eb':
//           15560000000000000000n,
//         '0x932285a2e33b89981d25eb586a3893e0f5a1a9da':
//           11000000000000000000n,
//         '0x3bc66727a37f7c0e1039540e3dc2254d39f420ff':
//           6000000000000000000n,
//         '0xf7c3128a43446621430530d6267d0eb21061fab6':
//           6020000000000000000n,
//       };

//       const allocations = await FundingPot.getAllocations(inflows);
//     });
//   });

// describe('#getRelativeContributions', () => {
//   it('returns issuance allocations for a given set of contribution inflows', async () => {
//     const inflows = {
//       '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe':
//         266076010000000n,
//       '0x6609384111b3644628b8865050cda1ebf8d85bbd':
//         150140000000000n,
//       '0x1778b55d436b3266a17d022a01145b3e91cbdd2b':
//         460539340000000n,
//     };

//     const contributions =
//       FundingPot.getRelativeContributions(inflows);

//     console.log(contributions);
//   });
// });
