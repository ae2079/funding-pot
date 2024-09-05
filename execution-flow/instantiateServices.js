import { Queries } from '../services/Queries/Queries.js';
import { Batch } from '../services/Batch/Batch.js';
import { Safe } from '../services/Safe/Safe.js';
import { TransactionBuilder } from '../services/TransactionBuilder/TransactionBuilder.js';

export const instantiateServices = async (projectConfig) => {
  const { ANKR_API_KEY, ANKR_NETWORK_ID, CHAIN_ID, INDEXER_URL } =
    process.env;

  const { SAFE, ORCHESTRATOR } = projectConfig;

  // instantiate services
  const queryService = new Queries({
    rpcUrl: `https://rpc.ankr.com/${ANKR_NETWORK_ID}/'${ANKR_API_KEY}`,
    indexerUrl: INDEXER_URL,
    chainId: CHAIN_ID,
  });

  await queryService.loadSdk();

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

  const batchService = new Batch();

  return {
    safeService,
    transactionBuilderService,
    batchService,
    queryService,
  };
};
