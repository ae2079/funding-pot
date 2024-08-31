import { encodeSingle, TransactionType } from 'ethers-multisend';
import {
  bondingCurveAbi,
  paymentRouterAbi,
  erc20Abi,
} from '../../data/abis.js';

PAYMENT_PUSHER_ROLE =
  '0x5041594d454e545f505553484552000000000000000000000000000000000000';

export class TransactionBuilder {
  transactions;

  constructor() {
    this.transactions = [];
  }

  buy(bondingCurveAddress, depositAmount, minAmountOut) {
    return this.getEncodedTx(
      bondingCurveAddress,
      bondingCurveAbi,
      'buy(uint256,uint256)',
      [depositAmount, minAmountOut]
    );
  }

  transferTokens(token, to, amount) {
    return this.getEncodedTx(
      token,
      erc20Abi,
      'transfer(address,uint256)',
      [to, amount]
    );
  }

  createVesting(
    paymentRouter,
    recipient,
    token,
    amount,
    start,
    cliff,
    end
  ) {
    return this.getEncodedTx(
      paymentRouter,
      paymentRouterAbi,
      'pushPayment(address,address,uint256,uint256,uint256,uint256)',
      [recipient, token, amount, start, cliff, end]
    );
  }

  assignVestingAdmin(paymentRouter, newRoleOwner) {
    return this.getEncodedTx(
      paymentRouter,
      paymentRouterAbi,
      'grantModuleRole(bytes32,address)',
      [PAYMENT_PUSHER_ROLE, newRoleOwner]
    );
  }

  getEncodedTx(to, abi, functionSignature, inputValues) {
    return encodeSingle({
      type: TransactionType.callContract,
      id: '0',
      to,
      value: '0',
      abi,
      functionSignature,
      inputValues,
    });
  }
}
