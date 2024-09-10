import '../../env.js';

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { proposeBatch } from './05_proposeBatch.js';
import { instantiateServices } from '../03_instantiateServices/03_instantiateServices.js';
import { keysToLowerCase } from '../../utils/helpers.js';
import {
  getProjectConfig,
  signAndExecutePendingTxs,
  mintMockTokens,
} from '../../utils/testHelpers.js';
import { getAddress } from 'viem';

describe('#proposeBatch', () => {
  let projectConfig;

  const batchConfig = {
    VESTING_DETAILS: {
      START: 1,
      CLIFF: 2,
      END: 10,
    },
  };

  const addr1 = '0xAeC9D8128a75Cb93B56D4dCf693a04251f8b9340';
  const addr2 = '0xce989336BdED425897Ac63d1359628E26E24f794';

  const issuance1 = 6_000_000_000_000_000n;
  const issuance2 = 4_000_000_000_000_000n;
  const additionalIssuance = issuance1 + issuance2;
  const totalValidContributions = 10_000_000_000_000_000n;

  let queryService,
    safeService,
    transactionBuilderService,
    batchService;

  before(async () => {
    // get project config (create if not exists)
    projectConfig = await getProjectConfig();
  });

  describe('with a small batch (2 vestings)', () => {
    beforeEach(async () => {
      // instantiate services
      ({
        queryService,
        safeService,
        transactionBuilderService,
        batchService,
      } = await instantiateServices(projectConfig, batchConfig));

      // set numbers
      batchService.data.totalValidContributions =
        totalValidContributions;
      batchService.data.additionalIssuance = additionalIssuance;
      batchService.data.participants = keysToLowerCase({
        [addr1]: {
          issuanceAllocation: issuance1,
        },
        [addr2]: {
          issuanceAllocation: issuance2,
        },
      });
    });

    it('proposes the batch', async () => {
      await proposeBatch({
        queryService,
        batchService,
        transactionBuilderService,
        safeService,
      });

      await mintMockTokens(
        getAddress(queryService.queries.addresses.collateralToken),
        totalValidContributions,
        getAddress(projectConfig.SAFE)
      );

      assert.doesNotThrow(async () => {
        await signAndExecutePendingTxs(projectConfig.SAFE);
      });
    });
  });

  describe('', () => {});
});
