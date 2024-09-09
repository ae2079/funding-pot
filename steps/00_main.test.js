import '../env.js';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { proposeBatch } from './05_proposeBatch.js';
import { instantiateServices } from './03_instantiateServices.js';
import { keysToLowerCase } from '../utils/helpers.js';
import {
  setupForE2E,
  signAndExecutePendingTxs,
  getVestings,
  getReport,
} from '../utils/testHelpers.js';
import { decodeEventLog } from 'viem';
import abis from '../data/abis.js';

import { main } from './00_main.js';
import { getConfigs } from './01_getConfigs.js';
import { get } from 'node:http';

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
    console.info('✅ Done waiting');

    const {
      projectsConfig: {
        [projectName]: { SAFE },
      },
    } = getConfigs(batchNr);
    safeAddress = SAFE;
  });

  it('proposes the batch to the safe', async () => {
    await main(projectName, batchNr);
    const [txReceipt] = await signAndExecutePendingTxs(safeAddress);
    const vestings = await getVestings(txReceipt.hash);
    const report = await getReport(projectName, batchNr);
    const { participants } = report.batch;

    for (const address in participants) {
      const { issuanceAllocation } = participants[address];
      if (!issuanceAllocation) continue;
      console.log('WTF');
      console.log(vestings);
      console.log(
        vestings.find((vesting) => {
          return vesting.amount.toString() === issuanceAllocation;
        }).length
      );
      console.log(
        !!vestings.find((vesting) => {
          return vesting.amount.toString() === issuanceAllocation;
        }).length
      );
      const found = !!vestings.find((vesting) => {
        return vesting.amount.toString() === issuanceAllocation;
      }).length;

      assert.ok(found);
    }
  });
});
