import { encodeSingle, TransactionType } from 'ethers-multisend';
import abis from '../../data/abis.js';
import { BATCH_SIZE } from '../../config.js';

const PAYMENT_PUSHER_ROLE =
  '0x5041594d454e545f505553484552000000000000000000000000000000000000';

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
    this.addTx(
      this.bondingCurve,
      'bondingCurveAbi',
      'buy(uint256,uint256)',
      [depositAmount, 1n]
    );
  }

  transferTokens(token, to, amount) {
    this.addTx(token, 'erc20Abi', 'transfer(address,uint256)', [
      to,
      amount,
    ]);
  }

  createVestings(vestingSpecs) {
    for (const vestingSpec of vestingSpecs) {
      const { recipient, amount } = vestingSpec;
      this.addTx(
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
      );
    }
  }

  assignVestingAdmin(newRoleOwner) {
    this.addTx(
      this.paymentRouter,
      'paymentRouterAbi',
      'grantModuleRole(bytes32,address)',
      [PAYMENT_PUSHER_ROLE, newRoleOwner]
    );
  }

  addTx(to, abiName, functionSignature, inputValues) {
    this.transactions.push({
      to,
      abiName,
      functionSignature,
      inputValues,
    });
  }

  getEncodedTxs() {
    const encodedTxs = [];
    for (const tx of this.transactions) {
      const { to, abiName, functionSignature, inputValues } = tx;
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
      encodedTxs.push({ ...encoded, value: '0' });
    }
    return encodedTxs;
  }

  // removes abi field from transactions
  getReadableTxBatches() {
    return this.getTxBatches(
      this.transactions.map((tx) => {
        const { to, functionSignature, inputValues } = tx;
        return {
          to,
          functionSignature,
          inputValues,
        };
      })
    );
  }

  getTxBatches(txs) {
    const txBatch = [];
    for (let i = 0; i < txs.length; i += BATCH_SIZE) {
      const chunk = txs.slice(i, i + BATCH_SIZE);
      txBatch.push(chunk);
    }
    return txBatch;
  }
}
