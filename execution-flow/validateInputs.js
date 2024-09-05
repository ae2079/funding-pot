import { isAddress } from 'viem';

export const validateInputs = ({
  projectConfig,
  batchConfig,
  allowlist,
}) => {
  validateEnvVars();
  validateConfigs({
    projectConfig,
    batchConfig,
    allowlist,
  });
};

const validateEnvVars = () => {
  console.log(process.env);
  const { ANKR_API_KEY, ANKR_NETWORK_ID, CHAIN_ID, INDEXER_URL } =
    process.env;

  if (!ANKR_API_KEY) throw new Error('ANKR_API_KEY missing');
  if (!ANKR_NETWORK_ID) throw new Error('ANKR_NETWORK_ID missing');
  if (!CHAIN_ID) throw new Error('CHAIN_ID missing');
  if (!INDEXER_URL) throw new Error('INDEXER_URL missing');
};

const validateConfigs = ({
  projectConfig,
  batchConfig,
  allowlist,
}) => {
  const {
    VESTING_DETAILS: { START, CLIFF, END },
  } = batchConfig;
  const { SAFE, ORCHESTRATOR } = projectConfig;

  if (!SAFE || !isAddress(SAFE))
    throw new Error('SAFE missing or invalid address');
  if (!ORCHESTRATOR || !isAddress(ORCHESTRATOR))
    throw new Error('ORCHESTRATOR missing or invalid address');

  if (!allowlist || allowlist.length === 0)
    throw new Error('ALLOWLIST missing or empty');
  if (!START || !CLIFF || !END)
    throw new Error('VESTING_DETAILS missing or empty');
  if (parseInt(START) > parseInt(END))
    throw new Error('Vesting: START > END');
  if (parseInt(START) + parseInt(CLIFF) > parseInt(END))
    throw new Error('Vesting: START > END');
};
