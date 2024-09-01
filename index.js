import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

import { Queries, Safe, TransactionBuilder, Batch } from './services';
import {
  validateInputs,
  proposeBatch,
  defineBatch,
} from './execution-flow';

const { ANKR_API_KEY } = process.env;
const [, , PROJECT_NAME, BATCH] = process.argv;

async function main() {
  // load project config (= project-specific constants)
  const projectsConfig = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `./data/input/projects.json`)
    )
  );

  // load batch config (batch-specific constants such as allowlist, start & end block, vesting schedule)
  const batchConfig = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `./data/input/batches/${BATCH}.json`)
    )
  );

  // checks if all required inputs are set
  validateInputs(projectsConfig, batchConfig);

  const {
    SAFE,
    BONDING_CURVE,
    CHAIN_ID,
    PAYMENT_ROUTER,
    ISSUANCE_TOKEN,
    COLLATERAL_TOKEN,
  } = projectsConfig[PROJECT_NAME];

  // instantiate services
  const queryService = new Queries({
    rpcUrl: 'https://rpc.ankr.com/optimism/' + ANKR_API_KEY,
    indexerUrl: 'https://indexer-v2.ankr.com/graphql',
    chainId: CHAIN_ID,
    bondingCurveAddress: BONDING_CURVE,
  });
  const transactionBuilderService = new TransactionBuilder({
    safe: SAFE,
    paymentRouter: PAYMENT_ROUTER,
    issuanceToken: ISSUANCE_TOKEN,
    collateralToken: COLLATERAL_TOKEN,
  });
  const safeService = new Safe(
    CHAIN_ID,
    SAFE,
    'https://rpc.ankr.com/optimism/' + ANKR_API_KEY
  );

  // define batch (= contributions, eligibility, received allocations, vesting details etc.)
  await defineBatch({
    queryService,
    batchService,
    projectsConfig,
    batchConfig,
  });

  // propose batch transactions to safe (= batch buy tx, vesting txs)
  await proposeBatch({
    batchService,
    transactionBuilderService,
    safeService,
  });

  // TODO: store comprehensive batch data in a JSON file
  const batchData = batchService.data;
  const safeTransactions = safeService.safeTransactions;
  const transactions = transactionBuilderService.transactions;

  console.log(420);
  console.log(transactions);

  fs.writeFileSync(
    path.join(__dirname, `./data/output/batches/${BATCH}.json`),
    JSON.stringify(batchData, null, 2)
  );
}

main();
