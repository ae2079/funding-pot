import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { defineBatch } from './04_defineBatch.js';
import { Queries } from '../../services/Queries/Queries.js';
import {
  batchConfigWithWrapper,
  batchReportDataWithWrapper,
  projectConfigWithWrapper,
} from '../../utils/testUtils/staticTestData.js';
import { Batch } from '../../services/Batch/Batch.js';
import { getAnkrRpcUrl } from '../../utils/helpers.js';
import { mockAllowlist } from '../../utils/testUtils/testHelpers.js';

const { CHAIN_ID, INDEXER_URL, BACKEND_URL } = process.env;

describe('#defineBatch', () => {
  let queryService, batchService;

  before(async () => {
    mockAllowlist({ type: 'static' });

    queryService = new Queries({
      rpcUrl: getAnkrRpcUrl(),
      indexerUrl: INDEXER_URL,
      chainId: CHAIN_ID,
      backendUrl: BACKEND_URL,
    });

    await queryService.setup(projectConfigWithWrapper.ORCHESTRATOR);

    batchService = new Batch({
      batchConfig: batchConfigWithWrapper,
    });
  });

  it('defines the batch', async () => {
    await defineBatch({
      queryService,
      batchService,
      projectConfig: projectConfigWithWrapper,
      batchConfig: batchConfigWithWrapper,
    });

    assert.deepStrictEqual(
      batchService.data,
      batchReportDataWithWrapper
    );
  });
});
