import dotenv from 'dotenv';
dotenv.config();

import { Queries } from './services/Queries/Queries.js';
import { Safe } from './services/Safe/Safe.js';
import { TransactionBuilder } from './services/TransactionBuilder/TransactionBuilder.js';
import { Allocations } from './services/Allocations/Allocations.js';

const { SAFE, BONDING_CURVE, ISSUANCE_TOKEN, ANKR_API_KEY } =
  process.env;

const queryService = new Queries({
  rpcUrl: 'https://rpc.ankr.com/optimism' + ANKR_API_KEY,
  indexerUrl: 'https://indexer-v2.ankr.com/graphql',
  blockExplorerUrl: 'https://goerli.etherscan.io',
  chainId: 5,
  bondingCurveAddress: BONDING_CURVE,
  issuanceTokenAddress: ISSUANCE_TOKEN,
});
