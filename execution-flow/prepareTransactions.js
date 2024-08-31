export const prepareTransactions = async ({
  batchService,
  transactionBuilderService,
  batchConfig,
}) => {
  const {
    totalValidContributions,
    safe,
    issuanceToken,
    collateralToken,
    bondingCurve,
  } = batchService.data;
  const allocations = batchService.getAllocations();

  // add batch buy tx
  transactionBuilderService.buy(
    bondingCurve,
    totalValidContributions,
    1
  );

  // add vesting txs
  transactionBuilderService.createVestings(allocations);
};
