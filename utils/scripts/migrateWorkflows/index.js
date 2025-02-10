import '../../../env.js';

import {
  loadProjectReport,
  getState,
  recreateIssuanceSnapshot,
  deployWorkflow,
  configureWorkflow,
} from './utils.js';
import { tokenToWrapper } from './inputs/wrappers.js';

async function main() {
  const [, , projectName] = process.argv;

  if (!projectName) {
    console.error('Please provide a project name as an argument');
    process.exit(1);
  }

  const report = loadProjectReport(projectName);
  const state = await getState(report.inputs.projectConfig);

  console.info('> START MIGRATION');

  // deploy workflow
  const workflow = await deployWorkflow(state);

  // mint and put all issuance tokens where they belong
  await recreateIssuanceSnapshot(
    workflow,
    state,
    tokenToWrapper,
    report
  );

  // configure workflow
  await configureWorkflow(workflow, state, tokenToWrapper, report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
