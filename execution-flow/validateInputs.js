import { isAddress } from 'viem';

export const validateInputs = ({
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
