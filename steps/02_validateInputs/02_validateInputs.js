import { isAddress } from 'viem';

export const validateInputs = ({
  batchNr,
  projectsConfig,
  projectName,
  batchConfig,
  batchReports,
}) => {
  validateEnvVars();
  validateConfigs({
    projectsConfig,
    projectName,
    batchConfig,
  });
  validatebatchReports({ batchNr, batchReports });
};

const validateEnvVars = () => {
  const {
    ANKR_API_KEY,
    ANKR_NETWORK_ID,
    CHAIN_ID,
    INDEXER_URL,
    BACKEND_URL,
  } = process.env;

  if (!ANKR_API_KEY) throw new Error('ANKR_API_KEY missing');
  if (!ANKR_NETWORK_ID) throw new Error('ANKR_NETWORK_ID missing');
  if (!CHAIN_ID) throw new Error('CHAIN_ID missing');
  if (!INDEXER_URL) throw new Error('INDEXER_URL missing');
  if (!BACKEND_URL) throw new Error('BACKEND_URL missing');
};

const validateConfigs = ({
  projectsConfig,
  projectName,
  batchConfig,
}) => {
  const { VESTING_DETAILS, LIMITS, IS_EARLY_ACCESS, PRICE } =
    batchConfig;
  const { SAFE, ORCHESTRATOR, NFT } = projectsConfig[projectName];

  if (!SAFE || !isAddress(SAFE))
    throwConfigError('SAFE missing or invalid address', {
      projectName,
      batchConfig,
    });
  if (!ORCHESTRATOR || !isAddress(ORCHESTRATOR))
    throwConfigError('ORCHESTRATOR missing or invalid address', {
      projectName,
      batchConfig,
    });
  if (!NFT || !isAddress(NFT))
    throwConfigError('NFT missing or invalid address', {
      projectName,
      batchConfig,
    });

  if (!PRICE)
    throwConfigError('PRICE missing or empty', {
      projectName,
      batchConfig,
    });

  if (IS_EARLY_ACCESS === undefined)
    throwConfigError('IS_EARLY_ACCESS missing or empty', {
      projectName,
      batchConfig,
    });
  if (!LIMITS || !LIMITS.TOTAL || !LIMITS.INDIVIDUAL)
    throwConfigError('LIMITS missing or empty', {
      projectName,
      batchConfig,
    });
  if (
    !VESTING_DETAILS ||
    !VESTING_DETAILS.START ||
    !VESTING_DETAILS.CLIFF ||
    !VESTING_DETAILS.END
  )
    throwConfigError('VESTING_DETAILS missing or empty', {
      projectName,
      batchConfig,
    });
  if (parseInt(VESTING_DETAILS.START) > parseInt(VESTING_DETAILS.END))
    throwConfigError('Vesting: START > END', {
      projectName,
      batchConfig,
    });
  if (
    parseInt(VESTING_DETAILS.START) +
      parseInt(VESTING_DETAILS.CLIFF) >
    parseInt(VESTING_DETAILS.END)
  )
    throwConfigError('Vesting: START + CLIFF > END', {
      projectName,
      batchConfig,
    });

  if (IS_EARLY_ACCESS === true) {
    if (!LIMITS.TOTAL_2) {
      throwConfigError('TOTAL_2 missing or empty', {
        projectName,
        batchConfig,
      });
    }
    if (!LIMITS.INDIVIDUAL_2) {
      throwConfigError('INDIVIDUAL_2 missing or empty', {
        projectName,
        batchConfig,
      });
    }
  }
};

const validatebatchReports = ({ batchReports, batchNr }) => {
  if (batchNr == 1) return;

  if (!batchReports) throw new Error('batchReports missing');

  const reportNumbers = Object.keys(batchReports);

  if (reportNumbers.includes(batchNr.toString())) {
    throw new Error(`Report already exists for batchNr ${batchNr}`);
  }

  if (batchNr - reportNumbers.length > 1)
    throw new Error(
      `Current batch nr is ${batchNr}, but there are only ${reportNumbers.length} previous batchReports`
    );

  for (let i = 1; i <= reportNumbers.length; i++) {
    if (!reportNumbers.includes(i.toString())) {
      throw new Error(`Report missing for batchNr ${i}`);
    }
  }
};

const throwConfigError = (msg, { projectName }) => {
  throw new Error(`Error in project ${projectName}: ${msg}`);
};
