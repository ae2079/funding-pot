export const prepareTransactions = async ({
  batchService,
  transactionBuilderService,
}) => {
  const { totalValidContributions } = batchService.data;
  const allocations = batchService.getAllocations();

  // add batch buy tx
  transactionBuilderService.buy(totalValidContributions);

  // add vesting txs
  transactionBuilderService.createVestings(allocations);


  // create tx batches
  transactionBuilderService.batchTxs();
};
