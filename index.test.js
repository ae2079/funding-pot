import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FundingPotService } from './FundingPotService.js';

describe('FundingPotService', () => {
  const rpcUrl =
    'https://endpoints.omniatech.io/v1/op/sepolia/public';
  const indexerUrl =
    'https://indexer.bigdevenergy.link/a414bf3/v1/graphql';
  const chainId = 11155420;
  const multisigAddress =
    '0x6747772f37a4F7CfDEA180D38e8ad372516c9548';

  const fundingPotService = new FundingPotService({
    rpcUrl,
    indexerUrl,
    chainId,
    multisigAddress,
  });

  describe('#getCutoffBlockNumber', () => {
    it('should return the timestamp of the last batch buy from the indexer', async () => {
      const cutoffBlocknumber =
        await fundingPotService.getCutoffBlockNumber();
      assert.equal(cutoffBlocknumber, 1721806864);
    });
  });
});
