export const proposeBatch = async ({
  queryService,
  batchService,
  transactionBuilderService,
  safeService,
  skipPropose = false,
}) => {
  const { additionalIssuance, matchingFundsAllocation } =
    batchService.data;
  const { collateralToken, bondingCurve } =
    queryService.queries.addresses;

  // use sum of total valid contribution and matching funds (if any)
  const collateralAmountIn = batchService.getCollateralAmountIn();

  // approve token
  transactionBuilderService.approve(
    collateralToken,
    bondingCurve,
    collateralAmountIn
  );

  // add batch buy tx
  transactionBuilderService.buy(collateralAmountIn);

  // send issuance tokens to payment router˚
  transactionBuilderService.transferTokens(
    queryService.queries.addresses.issuanceToken,
    queryService.queries.addresses.paymentRouter,
    BigInt(additionalIssuance) - BigInt(matchingFundsAllocation)
  );

  // get parsed allocations
  const allocations = await batchService.getAllocations();

  // add vesting txs
  transactionBuilderService.createVestings(allocations);

  // get encoded tx batches from transaction service
  const txBatches = transactionBuilderService.getEncodedTxBatches();

  if (skipPropose) {
    console.log('❗ Not proposing because ONLY_REPORT flag is set');
    return;
  }

  // propose tx batches
  await safeService.proposeTxs(txBatches);
};
