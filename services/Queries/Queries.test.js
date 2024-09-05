import '../../env.js';

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { getContract } from 'viem';

import abis from '../../data/abis.js';
import { Queries } from './Queries.js';

describe('Queries', () => {
  const indexerUrl =
    'https://indexer.bigdevenergy.link/7612f58/v1/graphql';
  const mockMulitSigAddress =
    '0x6747772f37a4F7CfDEA180D38e8ad372516c9548';

  const orchestratorAddress =
    '0x49BC19af25056Db61cfB4035A23ce3B509DF46B3';

  describe('#setup', () => {
    const querySevice = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
    });

    it("sets the bonding curve's address", async () => {
      await querySevice.setup(orchestratorAddress);
      assert.deepStrictEqual(querySevice.addresses, {
        bondingCurve: '0xb2c66815262f7a69189Fd7A2b2ea5482a6082958',
        collateralToken: '0x9464905aA41672B1fA9f2DC98fE54852f43bEBB3',
        issuanceToken: '0xD7b25E43A017795e98173820fE0AdBe20fE725Ad',
        paymentRouter: '0xD5EDa923A101508a52F6Dc3C1A4975f536B8e4B2',
        orchestrator: '0x49BC19af25056Db61cfB4035A23ce3B509DF46B3',
      });
      assert.doesNotThrow(async () => {
        await querySevice.bondingCurve.read.identifier();
      });
    });
  });

  describe('#getLastPurchaseBlock', () => {
    const querySevice = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
    });

    it('should return the blocknumber of the BUY', async () => {
      const startBlock = await querySevice.getLastPurchaseBlock(
        mockMulitSigAddress
      );
      assert.equal(startBlock, 1725525774);
    });
  });

  describe('#getCurrentBlockNumber', () => {
    const querySevice = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
    });

    it('should return the blocknumber of the BUY', async () => {
      const endBlock = await querySevice.getCurrentBlockNumber();
      assert(endBlock > 14903025n);
    });
  });

  // NOTE: requires the secret ANKR API key to be set in .env.example
  describe('#getInflows', () => {
    const startBlock = '124058551';
    const endBlock = '124058578';
    const token = '0xdC6fF44d5d932Cbd77B52E5612Ba0529DC6226F1';
    const recipient = '0x253DD57300904225762960755B7662e6ae06492d';

    const querySevice = new Queries({
      rpcUrl:
        'https://rpc.ankr.com/optimism/' + process.env.ANKR_API_KEY,
    });

    it('should return all inflows within the timeframe', async () => {
      const inflows = await querySevice.getInflows(
        token,
        recipient,
        startBlock,
        endBlock
      );

      assert.deepStrictEqual(inflows, {
        '0x327f6bc1b86eca753bfd2f8187d22b6aef7783eb': {
          contribution: 15560000000000000000n,
        },
        '0x932285a2e33b89981d25eb586a3893e0f5a1a9da': {
          contribution: 11000000000000000000n,
        },
        '0x3bc66727a37f7c0e1039540e3dc2254d39f420ff': {
          contribution: 6000000000000000000n,
        },
        '0xf7c3128a43446621430530d6267d0eb21061fab6': {
          contribution: 6020000000000000000n,
        },
      });
    });
  });

  describe('#getAmountOut', () => {
    const querySevice = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
    });
    querySevice.bondingCurve = getContract({
      address: '0xb2c66815262f7a69189Fd7A2b2ea5482a6082958',
      client: querySevice.publicClient,
      abi: abis.bondingCurveAbi,
    });

    it('should return the amount out', async () => {
      const amountOut = await querySevice.getAmountOut(
        1000000000000000000n
      );
      assert.equal(amountOut, 5412936922170809916n);
    });
  });

  describe('#getIssuanceSupply', () => {
    const querySevice = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
    });
    querySevice.bondingCurve = getContract({
      address: '0xb2c66815262f7a69189Fd7A2b2ea5482a6082958',
      client: querySevice.publicClient,
      abi: abis.bondingCurveAbi,
    });

    it('should return the amount out', async () => {
      const supply = await querySevice.getIssuanceSupply();
      assert.equal(supply, 352019916597003237761239n);
    });
  });

  describe('#getSpotPrice', () => {
    const querySevice = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
    });
    querySevice.bondingCurve = getContract({
      address: '0xb2c66815262f7a69189Fd7A2b2ea5482a6082958',
      client: querySevice.publicClient,
      abi: abis.bondingCurveAbi,
    });

    it('returns the spot price', async () => {
      const spotPrice = await querySevice.getSpotPrice();
      assert.equal(spotPrice, 180144n);
    });
  });

  describe('#getBalances', () => {
    const querySevice = new Queries({
      indexerUrl: process.env.INDEXER_URL,
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
    });
    querySevice.addresses = {
      orchestrator: '0x49BC19af25056Db61cfB4035A23ce3B509DF46B3',
    };

    it('gets aggregate vestings', async () => {
      const vestings = await querySevice.getBalances();

      assert.deepStrictEqual(vestings, {
        '0xa6e12EDe427516a56a5F6ab6e06dD335075eb04b': 420n,
        '0xCb1eDf0E617c0FaB6408701d58b746451EE6cE2f': 28n,
        '0xB4f8D886E9e831B6728D16Ed7F3a6c27974ABAA4': 82n,
        '0x6747772f37a4F7CfDEA180D38e8ad372516c9548': 4n,
        '0xCacC010EC451Cb33a7aE7cBa14de0a49293c2877': 7n,
      });
    });
  });
});
