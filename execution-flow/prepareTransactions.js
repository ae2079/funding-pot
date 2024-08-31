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
};
