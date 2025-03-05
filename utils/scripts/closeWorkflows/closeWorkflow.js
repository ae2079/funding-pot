import '../../../env.js';

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { loadProjectsConfig } from '../../../steps/01_loadInputs/01_loadInputs.js';
import { Safe } from '../../../services/Safe/Safe.js';
import { TransactionBuilder } from '../../../services/TransactionBuilder/TransactionBuilder.js';
import { keccak256, toHex } from 'viem';
import { Queries } from '../../../services/Queries/Queries.js';

import { getTokenSnapshot } from '../migrateWorkflows/utils.js';

const { CHAIN_ID, INDEXER_URL, BACKEND_URL, RPC_URL } = process.env;

export async function closeWorkflow(
  projectName,
  projectsConfig,
  adminMultisig
) {
  const projectConfig = projectsConfig[projectName];

  const queriesService = new Queries({
    rpcUrl: RPC_URL,
    indexerUrl: INDEXER_URL,
    chainId: CHAIN_ID,
    backendUrl: BACKEND_URL,
    advancedApiKey: process.env.ADVANCED_API_KEY,
  });

  await queriesService.setup(projectConfig.ORCHESTRATOR);
  const { addresses } = queriesService.queries;

  const transactionBuilder = new TransactionBuilder({
    projectConfig: { SAFE: adminMultisig },
    workflowAddresses: addresses,
    batchConfig: {
      VESTING_DETAILS: {
        START: 10,
        CLIFF: 0,
        END: 10,
      },
    },
  });
  const safe = new Safe(CHAIN_ID, { SAFE: adminMultisig }, RPC_URL);
  const snapshot = await getTokenSnapshot(addresses.issuanceToken);

  transactionBuilder.setMinter(adminMultisig, true);

  for (const entry of snapshot) {
    transactionBuilder.burnIssuance(
      entry.holderAddress,
      entry.balanceRawInteger
    );
  }

  transactionBuilder.setMinter(adminMultisig, false);
  transactionBuilder.setMinter(addresses.bondingCurve, false);
  transactionBuilder.renounceOwnership(addresses.mintWrapper);
  transactionBuilder.closeCurve();

  const collateralInFundingManager = await queriesService.balanceOf(
    addresses.collateralToken,
    addresses.bondingCurve
  );
  const feesCollected = await queriesService.feesCollected();

  transactionBuilder.createVestings(
    [
      {
        recipient: adminMultisig,
        amount: collateralInFundingManager - feesCollected,
      },
    ],
    addresses.collateralToken
  );

  transactionBuilder.claimStream();
  transactionBuilder.revokeCurveInteractionRole(projectConfig.SAFE);
  transactionBuilder.revokeVestingAdmin(projectConfig.SAFE);

  // Propose transactions
  const transactionJsons = transactionBuilder.getTransactionJsons(
    `[CLOSE-WORKFLOW]_[PROJECT-${projectName}]`,
    `Close workflow for ${projectName}`
  );

  transactionBuilder.saveTransactionJsons(transactionJsons);
}
