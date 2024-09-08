import '../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { defineBatch } from './04_defineBatch.js';
import { instantiateServices } from './03_instantiateServices.js';

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
  };
  const allowlist = ['0x6747772f37a4F7CfDEA180D38e8ad372516c9548'];

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

  it('does not throw an error', async () => {
    assert.doesNotThrow(async () => {
      await defineBatch({
        queryService,
        batchService,
        projectConfig,
        batchConfig,
        allowlist,
      });
    });
  });
});
