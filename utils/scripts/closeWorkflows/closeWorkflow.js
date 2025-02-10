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

export async function closeWorkflow(projectConfig, adminMultisig) {
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
  });
  const safe = new Safe(CHAIN_ID, { SAFE: adminMultisig }, RPC_URL);
  const snapshot = await getTokenSnapshot(addresses.issuanceToken);

  transactionBuilder.setMinter(adminMultisig);
  for (const entry of snapshot) {
    transactionBuilder.burnIssuance(
      entry.holderAddress,
      entry.balanceRawInteger
    );
  }

  // Propose transactions
  const txBatches = transactionBuilder.getEncodedTxBatches();

  await safe.proposeTxs(txBatches);

  //   // Deploy Roles
  //   const rolesModule = transactionBuilder.deployZodiacRoles(
  //     rolesFactory,
  //     rolesMasterCopy
  //   );

  //   // Enable Roles on Safe
  //   transactionBuilder.enableModule(admin, rolesModule);

  //   // Define role
  //   transactionBuilder.createRole(ROLE_KEY, rolesModule, feeRecipient);

  //   // // Assign role to fee claimer
  //   transactionBuilder.assignRole(ROLE_KEY, rolesModule, feeClaimer);

  //   // Propose transactions
  //   const txBatches = transactionBuilder.getEncodedTxBatches();

  //   await safe.proposeTxs(txBatches);

  //   return rolesModule;
}
