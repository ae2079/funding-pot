export const validateInputs = (projectsConfig, batchConfig) => {
  const {
    ALLOWLIST,
    VESTING_SPECS: { START, CLIFF, END },
  } = batchConfig;
  const {
    SAFE,
    ISSUANCE_TOKEN,
    COLLATERAL_TOKEN,
    PAYMENT_ROUTER,
    CHAIN_ID,
  } = projectsConfig[PROJECT_NAME];

  if (!SAFE) throw new Error('SAFE missing');
  if (!ISSUANCE_TOKEN) throw new Error('ISSUANCE_TOKEN missing');
  if (!COLLATERAL_TOKEN) throw new Error('COLLATERAL_TOKEN missing');
  if (!PAYMENT_ROUTER) throw new Error('PAYMENT_ROUTER missing');
  if (!CHAIN_ID) throw new Error('CHAIN_ID missing');

  if (!ALLOWLIST || ALLOWLIST.length === 0)
    throw new Error('ALLOWLIST missing or empty');
  if (!START || !CLIFF || !END)
    throw new Error('VESTING_SPECS missing or empty');
};
