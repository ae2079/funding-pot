export const prepareTransactions = async ({
  batchService,
  transactionBuilderService,
  batchConfig,
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
  transactionBuilderService.buy(
    bondingCurve,
    totalValidContributions,
    1
  );

  // add vesting txs
  transactionBuilderService.createVesting(
    safe,
    vestingDetails.start,
    vestingDetails.cliff,
    vestingDetails.end
  );
};
