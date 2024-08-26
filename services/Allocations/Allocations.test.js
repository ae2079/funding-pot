// import { describe, it, beforeEach } from 'node:test';
// import assert from 'node:assert';
// import { FundingPot } from './FundingPot.js';

// describe('FundingPot', () => {
//   const indexerUrl =
//     'https://indexer.bigdevenergy.link/a414bf3/v1/graphql';

//   const nftContractAddress =
//     '0xBCb0F73324F3Aff13e01cE81D85768FA55ff75Ea';
//   const bondingCurveAddress =
//     '0xcB18d34bCe932F39b645A0F06b8D9D0b981F6F87';
//   const multisigAddress =
//     '0xcB18d34bCe932F39b645A0F06b8D9D0b981F6F87';

//   const FundingPot = new FundingPot({
//     rpcUrl: 'https://sepolia.optimism.io',
//     indexerUrl,
//     multisigAddress,
//     nftContractAddress,
//     bondingCurveAddress,
//     isPrivate: false,
//   });

//   // const FundingPot = new FundingPot({
//   //   rpcUrl: opSepoliaRpcUrl,
//   //   indexerUrl,
//   //   chainId,
//   //   multisigAddress,
//   //   blockExplorerUrl: opSepliaBlockExplorerUrl,
//   //   nftContractAddress,
//   //   bondingCurveAddress,
//   //   isPrivate: false,
//   // });
//   //   describe('#enrichInflowData', () => {
//   //     it('should return enriched inflow data', async () => {
//   // const inflows = {
//   //   '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe':
//   //     266076010000000n,
//   //   '0x6609384111b3644628b8865050cda1ebf8d85bbd':
//   //     150140000000000n,
//   //   '0x1778b55d436b3266a17d022a01145b3e91cbdd2b':
//   //     460539340000000n,
//   // };
//   //       const newSupply = 1000000000000000000n;
//   //       const enrichedData = await FundingPot.enrichInflowData(
//   //         inflows,
//   //         newSupply
//   //       );
//   //       assert.deepStrictEqual(enrichedData, [
//   //         [
//   //           '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe',
//   //           {
//   //             contribution: 266076010000000n,
//   //             relBalance: 0.00026607601,
//   //           },
//   //         ],
//   //         [
//   //           '0x6609384111b3644628b8865050cda1ebf8d85bbd',
//   //           { contribution: 150140000000000n, relBalance: 0.00015014 },
//   //         ],
//   //         [
//   //           '0x1778b55d436b3266a17d022a01145b3e91cbdd2b',
//   //           {
//   //             contribution: 460539340000000n,
//   //             relBalance: 0.00046053934,
//   //           },
//   //         ],
//   //       ]);
//   //     });
//   //   });

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

//       const allocations = await FundingPot.getAllocations(
//         inflows
//       );
//     });
//   });

//   // describe('#getRelativeContributions', () => {
//   //   it('returns issuance allocations for a given set of contribution inflows', async () => {
//   //     const inflows = {
//   //       '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe':
//   //         266076010000000n,
//   //       '0x6609384111b3644628b8865050cda1ebf8d85bbd':
//   //         150140000000000n,
//   //       '0x1778b55d436b3266a17d022a01145b3e91cbdd2b':
//   //         460539340000000n,
//   //     };

//   //     const contributions =
//   //       FundingPot.getRelativeContributions(inflows);

//   //     console.log(contributions);
//   //   });
//   // });
// });
