import '../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  setupForE2E,
  signAndExecutePendingTxs,
  getVestings,
  getReport,
} from '../utils/testHelpers.js';

import { main } from './main.js';
import { getConfigs } from './01_getConfigs/01_getConfigs.js';

describe('#main', () => {
  const batchNr = '420';
  const projectName = 'TESTPROJECT';

  let safeAddress;

  before(async () => {
    await setupForE2E();
    console.info(
      '🕒 Waiting for 5 seconds for ANKR API to catch up...'
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const {
      projectsConfig: {
        [projectName]: { SAFE },
      },
    } = getConfigs(batchNr);
    safeAddress = SAFE;
  });

  it('creates vestings for eligible contributors', async () => {
    await main(projectName, batchNr);
    const [txReceipt] = await signAndExecutePendingTxs(safeAddress);
    const vestings = await getVestings(txReceipt.hash);
    const report = await getReport(projectName, batchNr);
    const { participants } = report.batch;

    for (const address in participants) {
      const { issuanceAllocation } = participants[address];
      if (!issuanceAllocation) continue;
      const found = !!vestings.find((vesting) => {
        return vesting.amount.toString() === issuanceAllocation;
      });

      assert.ok(found);
    }
  });
});
