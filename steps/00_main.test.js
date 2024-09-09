import '../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { proposeBatch } from './05_proposeBatch.js';
import { instantiateServices } from './03_instantiateServices.js';
import { keysToLowerCase } from '../utils/helpers.js';
import { setupForE2E } from '../utils/testHelpers.js';
import { getAddress } from 'viem';
import { main } from './00_main.js';

describe('#main', () => {
  before(async () => {
    await setupForE2E();
    console.log(
      '🕒 Waiting for 5 seconds for ANKR API to catch up...'
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('✅ Done waiting');
  });

  it('proposes the batch to the safe', async () => {
    await main('TESTPROJECT', '420');
  });
});
