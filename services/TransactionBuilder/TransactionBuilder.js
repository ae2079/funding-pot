import { encodeSingle, TransactionType } from 'ethers-multisend';
import {
  bondingCurveAbi,
  paymentRouterAbi,
  erc20Abi,
} from '../../data/abis.js';
import { batchSize } from '../../config.js';

const PAYMENT_PUSHER_ROLE =
  '0x5041594d454e545f505553484552000000000000000000000000000000000000';

export class TransactionBuilder {
  transactions;
  batchedTransactions;
  safe;
  paymentRouter;
  issuanceToken;
  collateralToken;
  bondingCurve;
  start;
  cliff;
  end;

  constructor({
    safe,
    paymentRouter,
    issuanceToken,
    collateralToken,
    bondingCurve,
    start,
    cliff,
    end,
  }) {
    this.transactions = [];
    this.batchedTransactions = [];
    this.safe = safe;
    this.paymentRouter = paymentRouter;
    this.issuanceToken = issuanceToken;
    this.collateralToken = collateralToken;
    this.bondingCurve = bondingCurve;
    this.start = start;
    this.cliff = cliff;
    this.end = end;
  }

  buy(depositAmount) {
    this.transactions.push(
      this.getEncodedTx(
        this.bondingCurve,
        bondingCurveAbi,
        'buy(uint256,uint256)',
        [depositAmount, 1n]
      )
    );
  }

  transferTokens(token, to, amount) {
    this.transactions.push(
      this.getEncodedTx(
        token,
        erc20Abi,
        'transfer(address,uint256)',
        [to, amount]
      )
    );
  }

  createVestings(vestingSpecs) {
    for (const vestingSpec of vestingSpecs) {
      const { recipient, amount } = vestingSpec;
      this.transactions.push(
        this.getEncodedTx(
          this.paymentRouter,
          paymentRouterAbi,
          'pushPayment(address,address,uint256,uint256,uint256,uint256)',
          [
            recipient,
            this.issuanceToken,
            amount,
            this.start,
            this.cliff,
            this.end,
          ]
        )
      );
    }
  }

  assignVestingAdmin(newRoleOwner) {
    this.transactions.push(
      this.getEncodedTx(
        this.paymentRouter,
        paymentRouterAbi,
        'grantModuleRole(bytes32,address)',
        [PAYMENT_PUSHER_ROLE, newRoleOwner]
      )
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

  batchTxs() {
    const { transactions } = this;
    const chunkSize = batchSize;
    for (let i = 0; i < transactions.length; i += chunkSize) {
      const chunk = transactions.slice(i, i + chunkSize);
      this.batchedTransactions.push(chunk);
    }
  }
}
