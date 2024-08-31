export const prepareTransactions = async ({
  batchService,
  transactionBuilderService,
}) => {
  const {
    totalValidContributions,
    vestingDetails: { start, cliff, end },
    safe,
    issuanceToken,
    collateralToken,
    bondingCurve,
  } = batchService.data;
  const allocations = batchService.getAllocations();

  // add batch buy tx
  transactionBuilderService.buy(totalValidContributions);

  // add vesting txs
  transactionBuilderService.createVestings(allocations);

  // create tx batches
  transactionBuilderService.batchTxs();
};
