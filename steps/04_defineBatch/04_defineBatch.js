export const defineBatch = async ({
  queryService,
  batchService,
  projectConfig,
  batchConfig,
  allowlist,
}) => {
  // get project & batch specific config
  const { TIMEFRAME } = batchConfig;
  const { SAFE } = projectConfig;

  // get timeframe
  const { fromTimestamp, toTimestamp } =
    await queryService.getTimeframe({
      configuration: TIMEFRAME,
      address: SAFE,
    });

  // get inflows
  const inflows = await queryService.getInflows(
    queryService.queries.addresses.collateralToken,
    SAFE,
    fromTimestamp,
    toTimestamp
  );

  batchService.assessInflows(inflows, allowlist);

  if (batchService.data.totalValidContribution === 0n)
    throw new Error('No valid contributions found');

  // get amountOut based on aggregate valid contributions
  const additionalIssuance = await queryService.getAmountOut(
    batchService.data.totalValidContribution
  );

  // calculate allocations
  batchService.calcAllocations(additionalIssuance);
};
