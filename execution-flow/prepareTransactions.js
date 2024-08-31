export const prepareTransactions = async ({
  batchService,
  transactionBuilderService,
  batchConfig,
}) => {
  const { totalValidContributions } = batchService.data;
  const allocations = batchService.getAllocations();

  // add batch buy tx
  transactionBuilderService.buy(totalValidContributions);

  // add vesting txs
  transactionBuilderService.createVestings(allocations);

  // get tx batches
  const txBatches = transactionBuilderService.getTxBatches();
};
