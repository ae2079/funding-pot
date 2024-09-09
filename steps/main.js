import { getConfigs } from './01_getConfigs/01_getConfigs.js';
import { validateInputs } from './02_validateInputs/02_validateInputs.js';
import { instantiateServices } from './03_instantiateServices/03_instantiateServices.js';
import { defineBatch } from './04_defineBatch/04_defineBatch.js';
import { proposeBatch } from './05_proposeBatch/05_proposeBatch.js';
import { storeReport } from './06_storeReport/06_storeReport.js';

export const main = async (projectName, batchNr) => {
  // load configs
  const { projectsConfig, batchConfig, allowlist } =
    getConfigs(batchNr);
  const projectConfig = projectsConfig[projectName];

  // checks if all required inputs are set in configs
  validateInputs({
    projectConfig,
    batchConfig,
    allowlist,
  });

  // instantiate services
  const {
    safeService,
    transactionBuilderService,
    batchService,
    queryService,
  } = await instantiateServices(projectConfig, batchConfig);

  // define batch (= contributions, eligibility, received allocations, vesting details etc.)
  await defineBatch({
    queryService,
    batchService,
    projectConfig,
    batchConfig,
    allowlist,
  });

  // propose batch transactions to safe (= batch buy tx, vesting txs) via Transaction API
  await proposeBatch({
    batchService,
    queryService,
    transactionBuilderService,
    safeService,
  });

  // store comprehensive report in a JSON file
  await storeReport(projectName, batchNr, {
    batchService,
    safeService,
    transactionBuilderService,
    queryService,
  });
};
