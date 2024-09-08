import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import { getConfigs } from './execution-flow/getConfigs.js';
import { validateInputs } from './execution-flow/validateInputs.js';
import { instantiateServices } from './execution-flow/instantiateServices.js';
import { defineBatch } from './execution-flow/defineBatch.js';
import { proposeBatch } from './execution-flow/proposeBatch.js';
import { storeBatchReport } from './execution-flow/storeBatchReport.js';

const [, , PROJECT_NAME, BATCH] = process.argv;

async function main() {
  // load configs
  const { projectsConfig, batchConfig, allowlist } =
    getConfigs(BATCH);

  // checks if all required inputs are set in configs
  validateInputs({
    projectConfig: projectsConfig[PROJECT_NAME],
    batchConfig,
    allowlist,
  });

  // instantiate services
  const {
    safeService,
    transactionBuilderService,
    batchService,
    queryService,
  } = instantiateServices(projectsConfig[PROJECT_NAME]);

  // define batch (= contributions, eligibility, received allocations, vesting details etc.)
  await defineBatch({
    queryService,
    batchService,
    projectsConfig,
    batchConfig,
  });

  // propose batch transactions to safe (= batch buy tx, vesting txs) via Transaction API
  await proposeBatch({
    batchService,
    transactionBuilderService,
    safeService,
  });

  // TODO: store comprehensive batch data in a JSON file
  await storeBatchReport(
    {
      batchService,
      safeService,
      transactionBuilderService,
    },
    BATCH,
    PROJECT_NAME
  );
}

main();
