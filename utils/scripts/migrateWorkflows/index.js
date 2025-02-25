import '../../../env.js';

import {
  loadProjectReport,
  getState,
  recreateIssuanceSnapshot,
  deployWorkflow,
  configureWorkflow,
} from './utils.js';
import { tokenToWrapper } from './input/wrappers.js';

async function main() {
  const [, , projectName] = process.argv;

  let migrationProtocol = {};

  if (!projectName) {
    console.error('Please provide a project name as an argument');
    process.exit(1);
  }

  const report = loadProjectReport(projectName);
  const state = await getState(report.inputs.projectConfig);

  console.info(
    '> START MIGRATION TO NETWORK: ',
    process.env.CHAIN_ID
  );

  // deploy workflow
  const deployed = await deployWorkflow(
    state,
    tokenToWrapper,
    migrationProtocol
  );

  migrationProtocol = deployed.migrationProtocol;

  migrationProtocol.orchestratorAddress =
    deployed.workflow.orchestrator.address;

  // mint and put all issuance tokens where they belong
  migrationProtocol = await recreateIssuanceSnapshot(
    deployed.workflow,
    state,
    tokenToWrapper,
    migrationProtocol
  );

  // write migration protocol to filesystem
  const fs = await import('fs');
  const path = await import('path');

  const outputDir = path.join(
    process.cwd(),
    'utils/scripts/migrateWorkflows/output'
  );

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${projectName}.json`);

  // configure workflow
  migrationProtocol = await configureWorkflow(
    deployed.workflow,
    state,
    tokenToWrapper,
    report,
    migrationProtocol
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(migrationProtocol, null, 2)
  );

  console.info('> Migration protocol written to:', outputPath);
}

main()
  .then(() => {
    console.info('> MIGRATION COMPLETE');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
