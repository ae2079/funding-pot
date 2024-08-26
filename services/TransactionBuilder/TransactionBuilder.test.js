import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransactionBuilder } from './TransactionBuilder.js';

describe('TransactionBuilder', () => {
  describe('#buy', () => {
    const bondingCurveAddress =
      '0xcB18d34bCe932F39b645A0F06b8D9D0b981F6F87';
    const transactionBuilder = new TransactionBuilder(
      'mock',
      bondingCurveAddress
    );

    it('returns the buy tx', async () => {
      const tx = transactionBuilder.buy(
        bondingCurveAddress,
        10n,
        10n
      );

      assert.deepStrictEqual(tx, {
        to: bondingCurveAddress,
        value: '0x00',
        data: '0xd6febde8000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000a',
      });
    });
  });

  describe('TODO: vesting', () => {});
});
