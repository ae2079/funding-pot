import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { QueryService } from './QueryService.js';
import { type } from 'node:os';

describe('QueryService', () => {
  const opSepoliaRpcUrl =
    'https://endpoints.omniatech.io/v1/op/sepolia/public';
  const cardonaRpcUrl = 'https://rpc.cardona.zkevm-rpc.com';
  const indexerUrl =
    'https://indexer.bigdevenergy.link/a414bf3/v1/graphql';
  const opSepliaBlockExplorerUrl =
    'https://api-sepolia-optimistic.etherscan.io/api';
  const cardonaBlockExplorerUrl =
    'https://api-sepolia-optimistic.etherscan.io/api';

  const mockMulitSigAddress =
    '0x6747772f37a4F7CfDEA180D38e8ad372516c9548';

  //   const querySevice = new QueryService({
  //     rpcUrl: 'https://zkevm-rpc.com',
  //     indexerUrl,
  //     blockExplorerUrl: 'https://api-zkevm.polygonscan.com/api',
  //   });
  //   const querySevice = new QueryService({
  //     rpcUrl: cardonaRpcUrl,
  //     indexerUrl,
  //     blockExplorerUrl: cardonaBlockExplorerUrl,
  //   });
  const querySevice = new QueryService({
    rpcUrl: opSepoliaRpcUrl,
    indexerUrl,
    blockExplorerUrl: opSepliaBlockExplorerUrl,
  });

  describe('#getStartBlock', () => {
    it('should return the blocknumber of the BUY', async () => {
      const startBlock = await querySevice.getStartBlock(
        mockMulitSigAddress
      );
      assert.equal(startBlock, 1721806864);
    });
  });

  describe('#getCurrentBlockNumber', () => {
    it('should return the blocknumber of the BUY', async () => {
      const endBlock = await querySevice.getCurrentBlockNumber();
      assert(endBlock > 15822618);
    });
  });

  describe('#getInflows', () => {
    const startBlock = '15822660';
    const endBlock = '15822667';
    const testToken = '0x298b4c4F9bE251c100724a3bEAe234BD1652CBcE';
    const recipient = '0xd7e3362FB7339E463e30521fE9288b6184B265b9';

    it('should return all inflows within the timeframe', async () => {
      const inflows = await querySevice.getInflows(
        testToken,
        recipient,
        startBlock,
        endBlock
      );

      assert.deepStrictEqual(inflows, {
        '0x02b01ddf989b3502ebbf8fd5bd803bc1924cedfe': 2660760100n,
        '0x6609384111b3644628b8865050cda1ebf8d85bbd': 1501400000n,
        '0x1778b55d436b3266a17d022a01145b3e91cbdd2b': 4605393400n,
      });
    });
  });

  describe('#getNftHolders', () => {
    const nontransferableNft =
      '0xBCb0F73324F3Aff13e01cE81D85768FA55ff75Ea';

    it('should return all NFT holders with their balances', async () => {
      const endBlock = await querySevice.getCurrentBlockNumber();
      const holders = await querySevice.getNftHolders(
        nontransferableNft,
        endBlock
      );

      assert.deepStrictEqual(holders, [
        '0x414a2e4db21926a91946e12c002d5a6037d7bbab',
        '0xd602ef9f510594c3efb1303e5cc814789c41be43',
        '0x417372a15130a1b9ee91f0bd01c7eaaa20967c42',
        '0xbcd24194b23c00fa11dba0513e89f8fcfb53d3f5',
        '0x06c1d351d0b2874847c1057ad35fa2ac99c88980',
      ]);
    });
  });
});
