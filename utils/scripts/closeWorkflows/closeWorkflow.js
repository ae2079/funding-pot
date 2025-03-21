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

export async function closeWorkflow(projectName, projectsConfig) {
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

  const adminCount = await queriesService.adminCount();
  if (adminCount > 1) {
    throw new Error('More than one admin found');
  }

  const firstAdmin = await queriesService.getFirstAdmin();
  if (firstAdmin === '0x0000000000000000000000000000000000000000') {
    throw new Error('No admin found - first admin is zero address');
  }

  const transactionBuilder = new TransactionBuilder({
    projectConfig: { SAFE: firstAdmin },
    workflowAddresses: addresses,
    batchConfig: {
      VESTING_DETAILS: {
        START: 10,
        CLIFF: 0,
        END: 10,
      },
    },
  });

  const snapshot = await getTokenSnapshot(addresses.issuanceToken);

  transactionBuilder.setMinter(firstAdmin, true);

  for (const entry of snapshot) {
    transactionBuilder.burnIssuance(
      entry.holderAddress,
      entry.balanceRawInteger
    );
  }

  transactionBuilder.setMinter(firstAdmin, false);
  transactionBuilder.setMinter(addresses.bondingCurve, false);
  transactionBuilder.renounceOwnership(addresses.mintWrapper);
  transactionBuilder.closeCurve();

  transactionBuilder.assignVestingAdmin(firstAdmin);

  const collateralInFundingManager = await queriesService.balanceOf(
    addresses.collateralToken,
    addresses.bondingCurve
  );
  const feesCollected = await queriesService.feesCollected();

  transactionBuilder.createVestings(
    [
      {
        recipient: firstAdmin,
        amount: collateralInFundingManager - feesCollected,
      },
    ],
    addresses.collateralToken
  );

  transactionBuilder.claimStream();
  transactionBuilder.revokeVestingAdmin(projectConfig.SAFE);

  // Propose transactions
  const transactionJsons = transactionBuilder.getTransactionJsons(
    `[CLOSE-WORKFLOW]-[PROJECT-${projectName}]`,
    `Close workflow for ${projectName}`
  );

  transactionBuilder.saveTransactionJsons(transactionJsons);
}
