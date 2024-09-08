import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import { getConfigs } from './execution-flow/01_getConfigs.js';
import { validateInputs } from './execution-flow/02_validateInputs.js';
import { instantiateServices } from './execution-flow/03_instantiateServices.js';
import { defineBatch } from './execution-flow/04_defineBatch.js';
import { proposeBatch } from './execution-flow/05_proposeBatch.js';
import { storeBatchReport } from './execution-flow/06_storeBatchReport.js';

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
