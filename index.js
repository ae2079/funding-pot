import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

import { Queries } from './services/Queries/Queries.js';
import { Safe } from './services/Safe/Safe.js';
import { TransactionBuilder } from './services/TransactionBuilder/TransactionBuilder.js';
import { Batch } from './services/Allocations/Batch.js';

const { ANKR_API_KEY } = process.env;
const [, , PROJECT_NAME, STEP] = process.argv;

async function main() {
  // load project config (= project-specific constants)
  const projectConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, `./data/input/config.json`))
  );
  // load batch config (batch-specific constants such as allowlist, start & end block)
  const batchConfig = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        `./data/input/${PROJECT_NAME}/${STEP}.json`
      )
    )
  );

  const {
    SAFE,
    BONDING_CURVE,
    CHAIN_ID,
    ISSUANCE_TOKEN,
    COLLATERAL_TOKEN,
    NFT,
  } = projectConfig[PROJECT_NAME];

  console.log(ANKR_API_KEY);

  // instantiate services
  const queryService = new Queries({
    rpcUrl: 'https://rpc.ankr.com/optimism/' + ANKR_API_KEY,
    indexerUrl: 'https://indexer-v2.ankr.com/graphql',
    chainId: CHAIN_ID,
    bondingCurveAddress: BONDING_CURVE,
  });
  const transactionBuilderService = new TransactionBuilder();
  const safeService = new Safe(
    CHAIN_ID,
    SAFE,
    'https://rpc.ankr.com/optimism/' + ANKR_API_KEY
  );

  const { timeframe, allowlist } = batchConfig;

  // get timeframe
  const { startBlock, endBlock } = await queryService.getTimeframe({
    ...timeframe,
    address: SAFE,
  });

  // get inflows
  const inflowsData = await queryService.getInflows(
    COLLATERAL_TOKEN,
    SAFE,
    startBlock,
    endBlock
  );

  const batchService = new Batch(inflowsData);

  // get addresses eligible for contribution
  const eligibleAddresses = allowlist
    ? allowlist
    : await queryService.getNftHolders(NFT);

  // earmark eligible addresses
  batchService.checkEligibility(eligibleAddresses);

  // add aggregate contribution data
  // batchService.calculateAggregateContributions();

  // calculate actual contributions taking into account the individual contribution cap
  const contributors = batchService.getContributors();
  const exAnteBalances = await queryService.getBalances(
    ISSUANCE_TOKEN,
    contributors
  );
  const exAnteIssuanceSupply = await queryService.getIssuanceSupply();
  const exAnteSpotPrice = await queryService.getSpotPrice();
  batchService.calculateValidContributions(
    exAnteIssuanceSupply,
    exAnteBalances,
    exAnteSpotPrice
  );

  // calculate aggregate contribution data
  batchService.calculateAggregateContributions();

  // get amountOut based on aggregate valid contributions
  const additionalIssuance = await queryService.getAmountOut(
    batchService.data.totalValidContributions
  );

  // calculate allocations
  batchService.calculateAllocations(additionalIssuance);
}

main();
