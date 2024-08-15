import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FundingPotService } from './FundingPotService.js';

describe('FundingPotService', () => {
  const indexerUrl =
    'https://indexer.bigdevenergy.link/a414bf3/v1/graphql';

  const nftContractAddress =
    '0xBCb0F73324F3Aff13e01cE81D85768FA55ff75Ea';
  const bondingCurveAddress =
    '0xcB18d34bCe932F39b645A0F06b8D9D0b981F6F87';
  const multisigAddress =
    '0xcB18d34bCe932F39b645A0F06b8D9D0b981F6F87';
  // const fundingPotService = new FundingPotService({
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
  //       const inflows = {
  //         '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe':
  //           266076010000000n,
  //         '0x6609384111b3644628b8865050cda1ebf8d85bbd':
  //           150140000000000n,
  //         '0x1778b55d436b3266a17d022a01145b3e91cbdd2b':
  //           460539340000000n,
  //       };
  //       const newSupply = 1000000000000000000n;
  //       const enrichedData = await fundingPotService.enrichInflowData(
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

  const fundingPotService = new FundingPotService({
    rpcUrl: 'https://sepolia.optimism.io',
    indexerUrl,
    multisigAddress,
    nftContractAddress,
    bondingCurveAddress,
    isPrivate: false,
  });

  // describe('#getAllocations', () => {
  //   it('returns issuance allocations for a given set of contribution inflows', async () => {
  //     const inflows = {
  //       '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe':
  //         266076010000000n,
  //       '0x6609384111b3644628b8865050cda1ebf8d85bbd':
  //         150140000000000n,
  //       '0x1778b55d436b3266a17d022a01145b3e91cbdd2b':
  //         460539340000000n,
  //     };

  //     const allocations = await fundingPotService.getAllocations(
  //       inflows
  //     );
  //   });
  // });

  describe('#getRelativeContributions', () => {
    it('returns issuance allocations for a given set of contribution inflows', async () => {
      const inflows = {
        '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe':
          266076010000000n,
        '0x6609384111b3644628b8865050cda1ebf8d85bbd':
          150140000000000n,
        '0x1778b55d436b3266a17d022a01145b3e91cbdd2b':
          460539340000000n,
      };

      const contributions =
        fundingPotService.getRelativeContributions(inflows);

      console.log(contributions);
    });
  });
});
