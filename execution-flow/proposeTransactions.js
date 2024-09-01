export const proposeTransactions = async ({
  batchService,
  transactionBuilderService,
  safeService,
}) => {
  const { totalValidContributions } = batchService.data;
  const allocations = batchService.getAllocations();

  // add batch buy tx
  transactionBuilderService.buy(totalValidContributions);

  // add vesting txs
  transactionBuilderService.createVestings(allocations);

  // create tx batches
  transactionBuilderService.batchTxs();

  // propose tx batches
  for (const txBatch of transactionBuilderService.batchedTransactions) {
    await safeService.proposeTxs(txBatch);
  }
};
