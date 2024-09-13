import '../../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { loadInputs } from './01_loadInputs.js';
import { createAndSaveAllowlist } from '../../utils/testHelpers.js';

describe('#loadInputs', () => {
  before(async () => {
    await createAndSaveAllowlist();
  });

  describe('with existing batch number', () => {
    const batchNumber = 1;
    it('returns the config', () => {
      const batchConfig = loadInputs(batchNumber);
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
        loadInputs(batchNumber);
      });
    });
  });
});
