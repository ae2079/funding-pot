export const defineBatch = async ({
  queryService,
  batchService,
  projectConfig,
  batchConfig,
}) => {
  // get project & batch specific config
  const { TIMEFRAME, IS_EARLY_ACCESS } = batchConfig;
  const { SAFE, NFT } = projectConfig;

  // get timeframe
  const { fromTimestamp, toTimestamp } =
    await queryService.getTimeframe({
      configuration: TIMEFRAME,
    });

  // get inflows
  const inflows = await queryService.getInflows(
    queryService.queries.addresses.collateralToken,
    SAFE,
    fromTimestamp,
    toTimestamp
  );

  // get nft holders
  const nftHolders = IS_EARLY_ACCESS
    ? await queryService.getNftHoldersForInflows(NFT, inflows)
    : [];

  // get allowlist
  const { privadoAllowlist, gitcoinAllowlist } =
    await queryService.getAllowlists();

  // based on allowlists and contribution limits per contributor
  // assess how much valid contributions they have
  batchService.assessInflows(
    inflows,
    privadoAllowlist,
    nftHolders,
    gitcoinAllowlist
  );

  // no valid contributions => no allocations
  // => no batch buy => no vestings
  if (batchService.data.totalValidContribution.inCollateral === 0n)
    return;

  // get amountOut based on aggregate valid contributions
  const additionalIssuance = await queryService.getAmountOut(
    batchService.data.totalValidContribution.inCollateral
  );

  // calculate allocations
  batchService.calcAllocations(additionalIssuance);
};
