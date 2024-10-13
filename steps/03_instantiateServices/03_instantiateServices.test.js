import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { instantiateServices } from './03_instantiateServices.js';
import {
  batchConfig,
  projectConfig,
} from '../../utils/testUtils/staticTestData.js';
import { parseUnits } from 'viem';
import { parse } from 'node:path';

describe('#instantiateServices', () => {
  let queryService,
    safeService,
    transactionBuilderService,
    batchService;

  before(async () => {
    console.log(batchConfig);
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
      individualLimit: parseUnits('2', 18),
      individualLimit2: parseUnits('0.2', 18),
      totalLimit: parseUnits('9', 18),
      totalLimit2: parseUnits('10', 18),
      isEarlyAccess: false,
      price: '0.1',
    });
    assert.deepStrictEqual(batchService.data, {
      aggregatedPreviousContributions: {},
    });
  });
});
