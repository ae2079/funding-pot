import './env.js';
import { main } from './steps/00_main.js';

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
