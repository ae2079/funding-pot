import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { instantiateServices } from './03_instantiateServices.js';

describe('#instantiateServices', () => {
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
    LIMITS: {
      TOTAL: '500000',
      INDIVIDUAL: '5000',
    },
  };

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
    assert.deepStrictEqual(Object.entries(batchService), [
      [
        'data',
        {
          totalCap: 500000000000000000000000n,
          individualCap: 5000000000000000000000n,
        },
      ],
    ]);
  });
});
