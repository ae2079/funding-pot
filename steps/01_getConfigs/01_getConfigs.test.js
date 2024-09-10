import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { getConfigs } from './01_getConfigs.js';
import { createAndSaveAllowlist } from '../../utils/testHelpers.js';

describe('#getConfigs', () => {
  before(async () => {
    await createAndSaveAllowlist();
  });

  describe('with existing batch number', () => {
    const batchNumber = 1;
    it('returns the config', () => {
      const batchConfig = getConfigs(batchNumber);
      assert.deepEqual(Object.keys(batchConfig), [
        'projectsConfig',
        'allowlist',
        'batchConfig',
      ]);
    });
  });

  describe('with non-existing batch number', () => {
    const batchNumber = 2;

    it('throws an error', () => {
      assert.throws(() => {
        getConfigs(batchNumber);
      });
    });
  });
});
