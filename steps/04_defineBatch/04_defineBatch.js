export const defineBatch = async ({
  queryService,
  batchService,
  projectConfig,
  batchConfig,
}) => {
  // get project & batch specific config
  const { TIMEFRAME } = batchConfig;
  const { SAFE, NFT } = projectConfig;

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

  // get nft holders
  const nftHolders = await queryService.getNftHolders(NFT);

  // get allowlist
  const allowlist = await queryService.getAllowlist();

  // based on allowlists and contribution limits per contributor
  // assess how much valid contributions they have
  batchService.assessInflows(inflows, allowlist, nftHolders);

  // no valid contributions => no allocations
  // => no batch buy => no vestings => error
  if (batchService.data.totalValidContribution === 0n)
    throw new Error('No valid contributions found');

  // get amountOut based on aggregate valid contributions
  const additionalIssuance = await queryService.getAmountOut(
    batchService.data.totalValidContribution
  );

  // calculate allocations
  batchService.calcAllocations(additionalIssuance);
};
