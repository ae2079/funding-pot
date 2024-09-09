import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { serializeBigInt } from '../utils/helpers.js';

export const storeReport = async (
  projectName,
  batchNr,
  {
    batchService,
    safeService,
    transactionBuilderService,
    queryService,
  }
) => {
  const report = {
    projectName,
    batchNr,
    batch: batchService.data,
    safe: {
      proposedTransactions: safeService.safeTransactions,
    },
    transactions: {
      readable: transactionBuilderService.getReadableTxBatches(),
      encoded: transactionBuilderService.getEncodedTxBatches(),
    },
    queries: queryService.queries,
  };

  const filePath = path.join(
    __dirname,
    `../data/${
      process.env.NODE_ENV === 'production' ? 'production' : 'test'
    }/output/${projectName}/${batchNr}.json`
  );

  fs.writeFileSync(filePath, serializeBigInt(report), 'utf8');

  console.info(
    `💾 Report for project ${projectName} with batch number ${batchNr} saved to ${filePath}`
  );
};
