import fs from 'fs';
import path from 'path';

export const storeBatchReport = async (
  { batchService, safeService, transactionBuilderService },
  batch,
  projectName
) => {
  const report = {
    batch: batchService.data,
    safe: safeService.safeTransactions,
    transactions: {
      readable: transactionBuilderService.getReadableTxBatches(),
      encoded: transactionBuilderService.getTxBatches(
        transactionBuilderService.getEncodedTxs()
      ),
    },
  };

  fs.writeFileSync(
    path.join(
      __dirname,
      `./data/output/${projectName}/${batch}.json`
    ),
    JSON.stringify(report, null, 2)
  );
};
