export const proposeBatch = async ({
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

  // propose tx batches
  for (const txBatch of transactionBuilderService.getTxBatches()) {
    await safeService.proposeTxs(txBatch);
  }
};
