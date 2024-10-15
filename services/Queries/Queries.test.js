import '../../env.js';

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { getContract, isAddress } from 'viem';

import abis from '../../data/abis.js';
import {
  inflows,
  projectConfig,
} from '../../utils/testUtils/staticTestData.js';
import { Queries } from './Queries.js';
import { getAnkrRpcUrl } from '../../utils/helpers.js';

describe('Queries', () => {
  describe('#setup', () => {
    const orchestratorAddress =
      '0x67360b514d756dfb8d1752e4f65b1f2e3acb5bc5';

    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });

    it('sets relevant workflow addresses', async () => {
      await queryService.setup(orchestratorAddress);
      assert.deepStrictEqual(queryService.queries.addresses, {
        bondingCurve: '0x941798FBA003F1FD3e3EC00205b33E3da6916895',
        collateralToken: '0x065775C7aB4E60ad1776A30DCfB15325d231Ce4F',
        issuanceToken: '0xDC282e0ee02e02D59040DA5130e72218D2441431',
        mintWrapper: '0x28E0D192526c59564D616247B876EE4D122EcA46',
        orchestrator: '0x67360b514d756dfb8d1752e4f65b1f2e3acb5bc5',
        paymentRouter: '0x63983C10695aE6d559b39011C969cAD6FfdAdf38',
      });
      assert.doesNotThrow(async () => {
        await queryService.bondingCurve.read.identifier();
      });
    });
  });

  describe('#getLastPurchaseBlock', () => {
    const mockMulitSigAddress =
      '0x6747772f37a4F7CfDEA180D38e8ad372516c9548';

    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });

    it('should return the blocknumber of the BUY', async () => {
      const fromTimestamp = await queryService.getLastPurchaseBlock(
        mockMulitSigAddress
      );
      assert.equal(fromTimestamp, 1728988940);
    });
  });

  describe('#getCurrentBlockNumber', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });

    it('should return the blocknumber of the BUY', async () => {
      const endBlock = await queryService.getCurrentBlockNumber();
      assert(endBlock > 14903025n);
    });
  });

  // NOTE: requires the secret ANKR API key to be set in .env.test
  describe('#getInflows', () => {
    const fromTimestamp = '1726684518';
    const toTimestamp = '1726692378';
    const token = '0x9464905aA41672B1fA9f2DC98fE54852f43bEBB3';
    const recipient = '0x4ffe42c1666e50104e997DD07E43c673FD39C81d';

    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: getAnkrRpcUrl(),
      chainId: process.env.CHAIN_ID,
    });

    it('should return all inflows within the timeframe', async () => {
      const receivedInflows = await queryService.getInflows(
        token,
        recipient,
        fromTimestamp,
        toTimestamp
      );

      assert.deepStrictEqual(receivedInflows, inflows);
    });
  });

  describe('#getAmountOut', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });
    queryService.bondingCurve = getContract({
      address: '0xb2c66815262f7a69189Fd7A2b2ea5482a6082958',
      client: queryService.publicClient,
      abi: abis.bondingCurveAbi,
    });

    it('should return the amount out', async () => {
      const amountOut = await queryService.getAmountOut(
        1000000000000000000n
      );
      assert.equal(amountOut, 5412936878032120963n);
    });
  });

  describe('#getIssuanceSupply', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });
    queryService.bondingCurve = getContract({
      address: '0xb2c66815262f7a69189Fd7A2b2ea5482a6082958',
      client: queryService.publicClient,
      abi: abis.bondingCurveAbi,
    });

    it('should return the issuance supply', async () => {
      const supply = await queryService.getIssuanceSupply();
      assert.equal(supply, 352019917143786833732572n);
    });
  });

  describe('#getSpotPrice', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });
    queryService.bondingCurve = getContract({
      address: '0xb2c66815262f7a69189Fd7A2b2ea5482a6082958',
      client: queryService.publicClient,
      abi: abis.bondingCurveAbi,
    });

    it('returns the spot price', async () => {
      const spotPrice = await queryService.getSpotPrice();
      assert.equal(spotPrice, 180144n);
    });
  });

  describe('#getBalances', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });
    queryService.queries.addresses = {
      orchestrator: projectConfig.ORCHESTRATOR,
    };

    it('gets aggregate vestings', async () => {
      const vestings = await queryService.getBalances();

      assert.deepStrictEqual(vestings, {
        '0xcb1edf0e617c0fab6408701d58b746451ee6ce2f': 28n,
        '0xb4f8d886e9e831b6728d16ed7f3a6c27974abaa4': 82n,
        '0xcacc010ec451cb33a7ae7cba14de0a49293c2877': 7n,
      });
    });
  });

  describe('#getTimeframe', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });
    queryService.queries.addresses = {
      orchestrator: projectConfig.ORCHESTRATOR,
    };
    const mockSafe = '0x6747772f37a4F7CfDEA180D38e8ad372516c9548';

    describe('with no configuration', () => {
      it('returns the timeframe from the last purchase block to the current block', async () => {
        const timeframe = await queryService.getTimeframe({
          configuration: undefined,
          safe: mockSafe,
        });
        assert.equal(timeframe.fromTimestamp, '1728988940');
        assert.equal(
          timeframe.toTimestamp > timeframe.fromTimestamp,
          true
        );
      });
    });

    describe('with configuration', () => {
      const configuration = {
        FROM_TIMESTAMP: '1725654505',
        TO_TIMESTAMP: '1725655119',
      };

      it('returns the timeframe from the last purchase block to the current block', async () => {
        const timeframe = await queryService.getTimeframe({
          configuration: configuration,
          safe: mockSafe,
        });
        assert.equal(timeframe.fromTimestamp, '1725654505');
        assert.equal(timeframe.toTimestamp, '1725655119');
      });
    });
  });

  describe('#getNftHolders', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: getAnkrRpcUrl(),
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });

    it('should return all NFT holders', async () => {
      await queryService.getNftHolders(projectConfig.NFT);

      assert.deepStrictEqual(queryService.queries.nftHolders, [
        '0x6747772f37a4f7cfdea180d38e8ad372516c9548',
        '0xa6e12ede427516a56a5f6ab6e06dd335075eb04b',
        '0xcb1edf0e617c0fab6408701d58b746451ee6ce2f',
      ]);
    });
  });

  describe('#getAllowlist', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: getAnkrRpcUrl(),
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });

    it('should return the allowlist', async () => {
      const addresses = await queryService.getAllowlist();
      for (const address of addresses) {
        assert.ok(isAddress(address));
      }
    });
  });

  describe('#getIssuanceTokenFromWrapper', () => {
    const queryService = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: getAnkrRpcUrl(),
      chainId: process.env.CHAIN_ID,
      backendUrl: process.env.BACKEND_URL,
    });

    queryService.queries.addresses.mintWrapper =
      '0x28E0D192526c59564D616247B876EE4D122EcA46';

    it('should return the issuance token', async () => {
      const token = await queryService.getIssuanceTokenFromWrapper();
      assert.ok(isAddress(token));
    });
  });
});
