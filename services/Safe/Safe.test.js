import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Safe } from './Safe.js';

describe('Safe', () => {
  const baseSepoliaChainId = 84532n;
  const safe = '0x4ffe42c1666e50104e997DD07E43c673FD39C81d';
  const rpc =
    'https://rpc.ankr.com/base_sepolia/83faca2c6ed984789a58e5dfbf9ba75d5b2b5d7c48646f6f51a004cb6cccca29';
  const Safe = new Safe(baseSepoliaChainId, safe, rpc);

  describe('addDelegate', () => {
    it.skip('addDelegate', async () => {
      await Safe.addDelegate(
        '0xa6e12EDe427516a56a5F6ab6e06dD335075eb04b'
      );
    });
  });

  describe('assembleMultiSendTx', async () => {
    it('assembles tx', async () => {
      await Safe.assembleMultiSendTx();
    });
  });

  describe('enqueueTx', async () => {
    it('', async () => {
      await Safe.enqueueTx();
    });
  });
});
