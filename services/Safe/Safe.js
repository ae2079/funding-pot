import 'dotenv/config';
import SafeApiKit from '@safe-global/api-kit';
import { privateKeyToAccount } from 'viem/accounts';
import { ethers } from 'ethers';
import {
  decodeMulti,
  encodeMulti,
  encodeSingle,
  TransactionType,
} from 'ethers-multisend';
import { counterAbi } from '../../abis.js';
import SafeGlobal from '@safe-global/protocol-kit';
import { TransactionBuilder } from '../TransactionBuilder/TransactionBuilder.js';

export class Safe {
  safeAddress;
  paymentRouterAddress;

  apiKit;
  protocolKit;
  transactionBuilder;

  constructor(chainId, safeAddress, rpcUrl, paymentRouterAddress) {
    this.apiKit = new SafeApiKit.default({
      chainId,
    });
    this.rpcUrl = rpcUrl;
    this.safeAddress = safeAddress;
    this.transactionBuilder = new TransactionBuilder(
      this.safeAddress,
      this.paymentRouterAddress,
      safeAddress,
      this.paymentRouterAddress
    );
  }

  async addDelegate(delegateAddress) {
    const wallet = new ethers.Wallet('0x' + process.env.PK);
    const response = await this.apiKit.addSafeDelegate({
      delegateAddress,
      delegatorAddress: account.address,
      safeAddress: this.safeAddress,
      signer: wallet,
      label: 'round-proposer',
    });

    return response;
  }

  async assignVestingAdmin() {}

  assembleMultiSendTx() {
    const tx = encodeSingle({
      type: TransactionType.callContract,
      id: '0',
      to: '0x6065c2c0D01f4Ee0f421bF4bcE7A7e911D17a2c0',
      value: '0',
      abi: counterAbi,
      functionSignature: 'increment()',
      inputValues: [],
    });

    console.log(tx);
    const multi = encodeMulti(
      [tx, tx],
      '0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B'
    );
    return multi;
  }

  async enqueueTx(txs) {
    if (!this.protocolKit) {
      this.protocolKit = await SafeGlobal.default.init({
        signer: '0x' + process.env.DELEGATE,
        provider: this.rpcUrl,
        safeAddress: this.safeAddress,
      });
    }
    console.log(this.assembleMultiSendTx());
    const safeTransaction = await this.protocolKit.createTransaction({
      transactions: [this.assembleMultiSendTx()],
      options: {},
    });
    const safeTxHash = await this.protocolKit.getTransactionHash(
      safeTransaction
    );
    const senderSignature = await this.protocolKit.signHash(
      safeTxHash
    );
    const nonce = await this.apiKit.getNextNonce(this.safeAddress);

    console.log('this.safeAddress', this.safeAddress);

    const x = await this.apiKit.proposeTransaction({
      safeAddress: this.safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: senderSignature.signer,
      senderSignature: senderSignature.data,
      origin: '',
      nonce,
    });

    // THIS IS A VALID REQUEST BODY
    // {
    //   "to": "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B",
    //   "value": "0",
    //   "data": "0x8d80ff0a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000b2006065c2c0d01f4ee0f421bf4bce7a7e911d17a2c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004d09de08a006065c2c0d01f4ee0f421bf4bce7a7e911d17a2c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004d09de08a0000000000000000000000000000",
    //   "operation": 1,
    //   "baseGas": "0",
    //   "gasPrice": "0",
    //   "gasToken": "0x0000000000000000000000000000000000000000",
    //   "refundReceiver": "0x0000000000000000000000000000000000000000",
    //   "nonce": 1,
    //   "safeTxGas": "0",
    //   "contractTransactionHash": "0xd99c2ab7a7d8292697824bef285bc6daebeadc79b71948dc9e346203b4e63e05",
    //   "sender": "0xa6e12EDe427516a56a5F6ab6e06dD335075eb04b",
    //   "signature": "0x7af050142e5ee8a37d07adc2315b52516ec4ffc467202adab27b81c5c5b2d928131c795cf4d282e7de5d550eff46b29b214440dbd55ff5931658af35cca410741f",
    //   "origin": "0"
    // }
  }
}
