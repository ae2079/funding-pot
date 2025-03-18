import '../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

import {
  setupForE2E,
  getVestings,
  signAndExecutePendingTxs,
  getReport,
} from '../utils/testUtils/e2eSetup.js';

import { main } from './main.js';
import { loadInputs } from './01_loadInputs/01_loadInputs.js';
import { WITH_PROPOSING } from '../config.js';

describe('#main', () => {
  const batchNr = '3';
  const season = '2';
  const projectName = 'GENERATED_TEST_PROJECT';

  let safeAddress;

  before(async () => {
    await setupForE2E();

    console.info(
      '🕒 Waiting for 5 seconds for ANKR API to catch up...'
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const { projectsConfig } = loadInputs(
      season,
      projectName,
      batchNr
    );
    const projectConfig = projectsConfig[projectName];
    const { SAFE } = projectConfig;
    safeAddress = SAFE;
  });

  it('executes or proposes batch', async () => {
    await main(season, projectName, batchNr);

    if (WITH_PROPOSING) {
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
    } else {
      const report = await getReport(projectName, batchNr);
      assert.equal(report.transactionJsons.length, 1);
    }
  });
});
