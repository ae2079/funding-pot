import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getConfigs } from './01_getConfigs.js';

describe('#getConfigs', () => {
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
