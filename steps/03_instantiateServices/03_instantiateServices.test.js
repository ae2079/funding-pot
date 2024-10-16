import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { instantiateServices } from './03_instantiateServices.js';
import {
  batchConfig,
  projectConfig,
} from '../../utils/testUtils/staticTestData.js';
import { inDollar } from '../../utils/testUtils/testHelpers.js';

describe('#instantiateServices', () => {
  let queryService,
    safeService,
    transactionBuilderService,
    batchService;

  before(async () => {
    ({
      queryService,
      safeService,
      transactionBuilderService,
      batchService,
    } = await instantiateServices(projectConfig, batchConfig));
  });

  it('instantiates the query service including setup step', () => {
    assert.deepStrictEqual(
      Object.keys(queryService).sort(),
      [
        'indexerUrl',
        'publicClient',
        'ankrProvider',
        'backendUrl',
        'networkIdString',
        'chainId',
        'queries',
        'bondingCurve',
      ].sort()
    );

    for (const value of Object.values(queryService)) {
      assert.notStrictEqual(value, undefined);
    }
  });

  it('instantiates the safe service', () => {
    assert.deepEqual(Object.keys(safeService), [
      'safeAddress',
      'apiKit',
      'protocolKit',
      'safeTransactions',
      'rpcUrl',
    ]);
  });

  it('instantiates the transaction builder service', () => {
    assert.deepEqual(Object.keys(transactionBuilderService), [
      'transactions',
      'safe',
      'paymentRouter',
      'issuanceToken',
      'collateralToken',
      'bondingCurve',
      'start',
      'cliff',
      'end',
    ]);

    for (const value of Object.values(transactionBuilderService)) {
      assert.notStrictEqual(value, undefined);
    }
  });

  it('instantiates the batch service', () => {
    assert.deepEqual(Object.keys(batchService), ['config', 'data']);
    assert.deepStrictEqual(batchService.config, {
      individualLimit: inDollar(
        batchConfig.LIMITS.INDIVIDUAL,
        batchConfig.PRICE
      ),
      individualLimit2: inDollar(
        batchConfig.LIMITS.INDIVIDUAL_2,
        batchConfig.PRICE
      ),
      totalLimit: inDollar(
        batchConfig.LIMITS.TOTAL,
        batchConfig.PRICE
      ),
      totalLimit2: inDollar(
        batchConfig.LIMITS.TOTAL_2,
        batchConfig.PRICE
      ),
      isEarlyAccess: false,
      price: '0.1',
    });
    assert.deepStrictEqual(batchService.data, {
      aggregatedPreviousContributions: {},
    });
  });
});
