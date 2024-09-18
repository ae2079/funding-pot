import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { defineBatch } from './04_defineBatch.js';
import { Queries } from '../../services/Queries/Queries.js';
import {
  batchConfig,
  batchData,
  projectConfig,
  inflows,
  addresses,
  allowlist,
} from '../../utils/testUtils/staticTestData.js';
import { Batch } from '../../services/Batch/Batch.js';
import { parseUnits } from 'viem';

const { ANKR_API_KEY, ANKR_NETWORK_ID, CHAIN_ID, INDEXER_URL } =
  process.env;

describe('#defineBatch', () => {
  let queryService, batchService;

  before(async () => {
    queryService = new Queries({
      rpcUrl: `https://rpc.ankr.com/${ANKR_NETWORK_ID}/${ANKR_API_KEY}`,
      indexerUrl: INDEXER_URL,
      chainId: CHAIN_ID,
    });
    await queryService.setup(projectConfig.ORCHESTRATOR);

    batchService = new Batch(
      parseUnits(batchConfig.CAPS.TOTAL, 18),
      parseUnits(batchConfig.CAPS.INDIVIDUAL, 18)
    );
  });

  it('defines the batch', async () => {
    await defineBatch({
      queryService,
      batchService,
      projectConfig,
      batchConfig,
      allowlist,
    });

    assert.deepStrictEqual(batchService.data, batchData);
  });
});
