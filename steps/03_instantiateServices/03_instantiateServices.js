import { Queries } from '../../services/Queries/Queries.js';
import { Batch } from '../../services/Batch/Batch.js';
import { Safe } from '../../services/Safe/Safe.js';
import { TransactionBuilder } from '../../services/TransactionBuilder/TransactionBuilder.js';

export const instantiateServices = async (
  projectConfig,
  batchConfig
) => {
  const { ANKR_API_KEY, ANKR_NETWORK_ID, CHAIN_ID, INDEXER_URL } =
    process.env;

  const { SAFE, ORCHESTRATOR } = projectConfig;
  const {
    VESTING_DETAILS: { START, CLIFF, END },
    LIMITS: { TOTAL, INDIVIDUAL },
  } = batchConfig;

  // instantiate services
  const queryService = new Queries({
    rpcUrl: `https://rpc.ankr.com/${ANKR_NETWORK_ID}/${ANKR_API_KEY}`,
    indexerUrl: INDEXER_URL,
    chainId: CHAIN_ID,
  });

  await queryService.setup(ORCHESTRATOR);

  const transactionBuilderService = new TransactionBuilder({
    safe: SAFE,
    paymentRouter: queryService.queries.addresses.paymentRouter,
    issuanceToken: queryService.queries.addresses.issuanceToken,
    collateralToken: queryService.queries.addresses.collateralToken,
    bondingCurve: queryService.queries.addresses.bondingCurve,
    start: START,
    cliff: CLIFF,
    end: END,
  });

  const safeService = new Safe(
    CHAIN_ID,
    SAFE,
    `https://rpc.ankr.com/${ANKR_NETWORK_ID}/${ANKR_API_KEY}`
  );

  const batchService = new Batch(
    parseUnits(TOTAL, 18),
    parseUnits(INDIVIDUAL, 18)
  );

  return {
    safeService,
    transactionBuilderService,
    batchService,
    queryService,
  };
};
