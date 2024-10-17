import { loadInputs } from './01_loadInputs/01_loadInputs.js';
import { validateInputs } from './02_validateInputs/02_validateInputs.js';
import { instantiateServices } from './03_instantiateServices/03_instantiateServices.js';
import { defineBatch } from './04_defineBatch/04_defineBatch.js';
import { proposeBatch } from './05_proposeBatch/05_proposeBatch.js';
import { storeReport } from './06_storeReport/06_storeReport.js';

export const main = async (projectName, batchNr) => {
  console.info(
    `🚀 Starting batch execution for project ${projectName} with batch number ${batchNr}`
  );

  // load configs & batchReports
  console.info(`1️⃣ Loading configs...`);
  const { projectsConfig, batchConfig, allowlist, batchReports } =
    loadInputs(projectName, batchNr);

  // checks if all required inputs are set in configs
  console.info(`2️⃣ Validating inputs...`);
  validateInputs({
    batchNr,
    projectsConfig,
    projectName,
    batchConfig,
    allowlist,
    batchReports,
  });

  // deconstruct project config
  const projectConfig = projectsConfig[projectName];

  // instantiate services
  console.info(`3️⃣ Instantiating services...`);
  const {
    safeService,
    transactionBuilderService,
    batchService,
    queryService,
  } = await instantiateServices(
    projectConfig,
    batchConfig,
    batchReports
  );

  // define batch (= contributions, eligibility, received allocations, vesting details etc.)
  console.info(`4️⃣ Defining batch...`);
  await defineBatch({
    queryService,
    batchService,
    projectConfig,
    batchConfig,
    allowlist,
  });

  console.dir(batchService, { depth: null });

  if (
    batchService.data.totalValidContribution.inCollateral > 0n &&
    !batchConfig.ONLY_REPORT
  ) {
    // propose batch transactions to safe (= batch buy tx, vesting txs) via Transaction API
    console.info(`5️⃣ Proposing batch...`);
    await proposeBatch({
      batchService,
      queryService,
      transactionBuilderService,
      safeService,
    });
  }

  // store comprehensive report in a JSON file
  console.info(`6️⃣ Storing report...`);
  await storeReport(projectName, batchNr, {
    batchService,
    safeService,
    transactionBuilderService,
    queryService,
  });

  console.info(`🏁 Batch execution complete!`);
};
