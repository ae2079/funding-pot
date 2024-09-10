import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { defineBatch } from './04_defineBatch.js';
import { instantiateServices } from '../03_instantiateServices/03_instantiateServices.js';

describe('#defineBatch', () => {
  const projectConfig = {
    ORCHESTRATOR: '0x49BC19af25056Db61cfB4035A23ce3B509DF46B3',
    SAFE: '0x4ffe42c1666e50104e997DD07E43c673FD39C81d',
  };
  const batchConfig = {
    VESTING_DETAILS: {
      START: 1,
      CLIFF: 2,
      END: 10,
    },
    TIMEFRAME: {
      FROM_TIMESTAMP: '0',
      TO_TIMESTAMP: '1725870994',
    },
  };
  const allowlist = [
    '0xB4f8D886E9e831B6728D16Ed7F3a6c27974ABAA4',
    '0x6747772f37a4F7CfDEA180D38e8ad372516c9548',
    '0xCb1eDf0E617c0FaB6408701d58b746451EE6cE2f',
  ];

  let queryService, batchService;

  before(async () => {
    ({ queryService, batchService } = await instantiateServices(
      projectConfig,
      batchConfig
    ));

    await defineBatch({
      queryService,
      batchService,
      projectConfig,
      batchConfig,
      allowlist,
    });
  });

  it('defines the batch', async () => {
    await defineBatch({
      queryService,
      batchService,
      projectConfig,
      batchConfig,
      allowlist,
    });

    assert.deepStrictEqual(batchService.data, {
      totalValidContributions: 13185855190790067000000n,
      totalExcessContributions: 999940149144809209933000000n,
      participants: {
        '0x6747772f37a4f7cfdea180d38e8ad372516c9548': {
          contribution: 999951190000000000000000000n,
          permitted: true,
          excessContribution: 999938507144809209933000000n,
          validContribution: 12682855190790067000000n,
          issuanceAllocation: 47251930500000000000000n,
        },
        '0xb4f8d886e9e831b6728d16ed7f3a6c27974abaa4': {
          contribution: 150000000000000000000n,
          permitted: true,
          validContribution: 150000000000000000000n,
          issuanceAllocation: 558848100000000000000n,
        },
        '0xcb1edf0e617c0fab6408701d58b746451ee6ce2f': {
          contribution: 353000000000000000000n,
          permitted: true,
          validContribution: 353000000000000000000n,
          issuanceAllocation: 1315155800000000000000n,
        },
        '0xa6e12ede427516a56a5f6ab6e06dd335075eb04b': {
          contribution: 142000000000000000000n,
          permitted: false,
          excessContribution: 142000000000000000000n,
        },
        '0x5e657719aee21a6bb1bcaad7781dce222186ca72': {
          contribution: 1500000000000000000000n,
          permitted: false,
          excessContribution: 1500000000000000000000n,
        },
      },
      exAnteSupply: 352019917143786833732572n,
      exAnteSpotPrice: 180144n,
      issuanceTokenCap: 7040398342875737000000n,
      additionalIssuance: 49125934549779909654491n,
    });
  });
});
