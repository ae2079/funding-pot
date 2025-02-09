import '../../../env.js';

import {
  loadProjectReport,
  getState,
  recreateTokenSnapshot,
  deployWorkflow,
} from './utils.js';
import { tokenToWrapper } from './wrappers.js';

async function main() {
  const [, , projectName] = process.argv;

  if (!projectName) {
    console.error('Please provide a project name as an argument');
    process.exit(1);
  }

  const report = loadProjectReport(projectName);
  const state = await getState(report.inputs.projectConfig);

  // mints issuance tokens according to the token snapshot
  //   await recreateTokenSnapshot(state, tokenToWrapper);

  // deploy workflow
  await deployWorkflow(state);

  // Add your migration logic here using the outputData
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
