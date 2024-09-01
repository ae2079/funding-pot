import { encodeSingle, TransactionType } from 'ethers-multisend';
import abis from '../../data/abis.js';
import { batchSize } from '../../config.js';

const PAYMENT_PUSHER_ROLE =
  '0x5041594d454e545f505553484552000000000000000000000000000000000000';

const { bondingCurveAbi, paymentRouterAbi, erc20Abi } = abis;

export class TransactionBuilder {
  transactions;
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
        'bondingCurveAbi',
        'buy(uint256,uint256)',
        [depositAmount, 1n]
      )
    );
  }

  transferTokens(token, to, amount) {
    this.transactions.push(
      this.getEncodedTx(
        token,
        'erc20Abi',
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
          'paymentRouterAbi',
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
        'paymentRouterAbi',
        'grantModuleRole(bytes32,address)',
        [PAYMENT_PUSHER_ROLE, newRoleOwner]
      )
    );
  }

  getEncodedTx(to, abiName, functionSignature, inputValues) {
    const abi = abis[abiName];
    const encoded = encodeSingle({
      type: TransactionType.callContract,
      id: '0',
      to,
      value: '0',
      abi,
      functionSignature,
      inputValues,
    });
    // encodeSingle returns a value of '0x00' for value
    // but the Safe API only accepts '0' => overwrite
    return { ...encoded, value: '0' };
  }

  getTxBatches() {
    const txBatch = [];
    const { transactions } = this;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const chunk = transactions.slice(i, i + batchSize);
      txBatch.push(chunk);
    }
    return txBatch;
  }

  getEncodedTxs() {
    const encodedTxs = [];
    for (const tx of this.transactions) {
      encodedTxs.push(this.getEncodedTx(tx));
    }
    return encodedTxs;
  }
}
