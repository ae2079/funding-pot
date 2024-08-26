import {
  decodeMulti,
  encodeMulti,
  encodeSingle,
  TransactionType,
} from 'ethers-multisend';
import {
  counterAbi,
  bondingCurveAbi,
  paymentRouterAbi,
} from '../../abis.js';

export class TransactionBuilder {
  paymentPusherRole = ''; // TODO

  buy(bondingCurveAddress, depositAmount, minAmountOut) {
    const tx = encodeSingle({
      type: TransactionType.callContract,
      id: '0',
      to: bondingCurveAddress,
      value: '0',
      abi: bondingCurveAbi,
      functionSignature: 'buy(uint256,uint256)',
      inputValues: [depositAmount, minAmountOut],
    });
    return tx;
  }

  assignVestingAdmin(paymentRouter, recipient) {
    const tx = encodeSingle({
      type: TransactionType.callContract,
      id: '0',
      to: paymentRouter,
      value: '0',
      abi: paymentRouterAbi,
      functionSignature: 'grantModuleRole',
      inputValues: [this.paymentPusherRole, recipient],
    });
    return tx;
  }
}
