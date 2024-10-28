import '../../env.js';

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { loadProjectsConfig } from '../../steps/01_loadInputs/01_loadInputs.js';
import { Safe } from '../../services/Safe/Safe.js';
import { Queries } from '../../services/Queries/Queries.js';
import { TransactionBuilder } from '../../services/TransactionBuilder/TransactionBuilder.js';

const [, , PROJECT_NAME] = process.argv;
const { CHAIN_ID, INDEXER_URL, BACKEND_URL, RPC_URL } = process.env;

function loadVestingsConfig() {
  const vestingsConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'inputs/vestings.json'))
  );
  return vestingsConfig;
}

async function createVestings(projectName, vestingDetails) {
  console.info(`🙌 Creating vestings for ${projectName}`);
  console.info(`    Start: ${vestingDetails.VESTING_DETAILS.START}`);
  console.info(`    End: ${vestingDetails.VESTING_DETAILS.END}`);
  console.info(`    Cliff: ${vestingDetails.VESTING_DETAILS.CLIFF}`);
  for (
    let i = 0;
    i < vestingDetails.VESTINGS[projectName].length;
    i++
  ) {
    console.info(
      `         Vesting ${i}: ${vestingDetails.VESTINGS[projectName][i].recipient} receives ${vestingDetails.VESTINGS[projectName][i].amount}`
    );
  }

  const projectsConfig = loadProjectsConfig();
  const projectConfig = projectsConfig[projectName];
  const queries = new Queries({
    rpcUrl: RPC_URL,
    indexerUrl: INDEXER_URL,
    chainId: CHAIN_ID,
    backendUrl: BACKEND_URL,
  });
  await queries.setup(projectConfig.ORCHESTRATOR);
  const transactionBuilder = new TransactionBuilder({
    projectConfig,
    workflowAddresses: queries.queries.addresses,
    batchConfig: vestingDetails,
  });
  transactionBuilder.createVestings(
    vestingDetails.VESTINGS[projectName]
  );
  const txBatches = transactionBuilder.getEncodedTxBatches();
  const safe = new Safe(CHAIN_ID, projectConfig, RPC_URL);
  await safe.proposeTxs(txBatches);
  console.log(`✅ Vesting transactions proposed for ${projectName}`);
}

// requires to have PK of safe owner stored in env
async function main() {
  const vestingsConfig = loadVestingsConfig();
  createVestings(PROJECT_NAME, vestingsConfig);
}

main();
