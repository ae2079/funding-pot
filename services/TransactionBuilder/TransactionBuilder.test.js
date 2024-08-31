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

    it('returns the raw tx', async () => {
      transactionBuilder.buy(bondingCurveAddress, 10n, 10n);

      const [tx] = transactionBuilder.transactions;

      assert.deepStrictEqual(tx, {
        to: bondingCurveAddress,
        value: '0x00',
        data: '0xd6febde8000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000a',
      });
    });
  });

  describe('#assignVestingAdmin', () => {
    const paymentRouterAddress =
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // mock
    const recipient = '0x0000000000000000000000000000000000000001';

    it('returns the raw tx', async () => {
      const transactionBuilder = new TransactionBuilder();
      transactionBuilder.assignVestingAdmin(
        paymentRouterAddress,
        recipient
      );
      const [tx] = transactionBuilder.transactions;

      assert.deepStrictEqual(tx, {
        to: paymentRouterAddress,
        value: '0x00',
        data: '0x6c67e8075041594d454e545f5055534845520000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
      });
    });
  });

  describe('#createVesting', () => {
    const paymentRouterAddress =
      '0x0000000000000000000000000000000000000001'; // mock
    const recipient = '0x0000000000000000000000000000000000000002';
    const token = '0x0000000000000000000000000000000000000003';
    const amount = 10n;
    const start = 10n;
    const cliff = 10n;
    const end = 10n;

    it('returns the raw tx', async () => {
      const transactionBuilder = new TransactionBuilder();
      transactionBuilder.createVesting(
        paymentRouterAddress,
        recipient,
        token,
        amount,
        start,
        cliff,
        end
      );
      const [tx] = transactionBuilder.transactions;

      assert.deepStrictEqual(tx, {
        to: paymentRouterAddress,
        value: '0x00',
        data: '0x8028b82f00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000a',
      });
    });
  });

  describe('#transferTokens', () => {
    const tokenAddress = '0x0000000000000000000000000000000000000001'; // mock
    const recipient = '0x0000000000000000000000000000000000000002';
    const amount = 10n;

    it('returns the raw tx', async () => {
      const transactionBuilder = new TransactionBuilder();
      transactionBuilder.transferTokens(
        tokenAddress,
        recipient,
        amount
      );
      const [tx] = transactionBuilder.transactions;

      assert.deepStrictEqual(tx, {
        to: tokenAddress,
        value: '0x00',
        data: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a',
      });
    });
  });
});
