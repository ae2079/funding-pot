export const defineBatch = async ({
  queryService,
  batchService,
  projectConfig,
  batchConfig,
  allowlist,
}) => {
  // get project & batch specific config
  const {
    TIMEFRAME,
    VESTING_DETAILS: { START, CLIFF, END },
  } = batchConfig;
  const { SAFE } = projectConfig;

  // get timeframe
  const { fromTimestamp, toTimestamp } =
    await queryService.getTimeframe({
      ...TIMEFRAME,
      address: SAFE,
    });

  // get inflows
  const inflowsData = await queryService.getInflows(
    queryService.addresses.collateralToken,
    SAFE,
    fromTimestamp,
    toTimestamp
  );

  // earmark eligible addresses
  batchService.checkEligibility(inflowsData, allowlist);

  // calculate actual contributions taking into account the individual contribution CAP
  const contributors = batchService.getContributors();
  const exAnteBalances = await queryService.getBalances(
    queryService.addresses.issuanceToken,
    contributors
  );
  const exAnteIssuanceSupply = await queryService.getIssuanceSupply();
  const exAnteSpotPrice = await queryService.getSpotPrice();
  batchService.calculateValidContributions(
    exAnteIssuanceSupply,
    exAnteSpotPrice,
    exAnteBalances
  );

  // calculate aggregate contribution data
  batchService.calculateAggregateContributions();

  // get amountOut based on aggregate valid contributions
  const additionalIssuance = await queryService.getAmountOut(
    batchService.data.totalValidContributions
  );

  // calculate allocations
  batchService.calculateAllocations(additionalIssuance);

  console.log(batchService.data);
};
