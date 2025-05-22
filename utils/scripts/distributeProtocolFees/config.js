// fees/claim-fees/config.js
export const config = {
  feeCollectorMs: '0x7022CE36B265cAcD497b2d3AC70fB7020d3892a6',
  tokens: [
    '0x6fc91fbe42f72941486c98d11724b14fb8d18b36',
    '0x878b6bf76f7ba67d0c4da616eac1933f9b133c1c',
    '0x69ce536f95a84e1ef51ed0132c514c7ce012e49b',
    '0x4fb9b94bd8bbbd684a7d5a5544bc7a07188e5617',
    '0xc530b75465ce3c6286e718110a7b2e2b64bdc860',
    '0xa3dd6163b5742b0d8cb7d79cb5dfe3f81f8f8fc4',
    '0x0d9b0790e97e3426c161580df4ee853e4a7c4607',
    '0x5fdaf637aed59b2e6d384d9e84d8ac5cf03c6697',
    '0xfafb870f1918827fe57ca4b891124606eaa7e6bd',
    '0x0b7a46e1af45e1eaadeed34b55b6fc00a85c7c68',
    '0x4191f84f66e0b7cc10370ff47a0e2168e35b9bdf',
    '0xa1a78ac9884adc9d04d59b2b743f1ec709618e55',
  ],
  recipients: [
    {
      name: 'QACC',
      address: 'TODO',
      share: 0, // TODO, e.g. 0.6 for 60%
    }, // 60%
    {
      name: 'Inverter',
      address: 'TODO',
      share: 0, // TODO
    }, // 30%
    {
      name: 'Bug Bounty',
      address: 'TODO',
      share: 0, // TODO
    }, // 10%
  ],
  rpcUrl: 'https://1rpc.io/matic',
  chainId: '137', // e.g., "1" for Ethereum Mainnet
  batchSize: 200, // Max transactions per Gnosis Safe JSON file
  distributeNativeToken: true, // Flag to enable/disable native token distribution
  nativeTokenSymbol: 'MATIC', // Symbol for the native token (e.g., ETH, MATIC)
  transactionMeta: {
    namePrefix: 'Fee Distribution',
    description:
      'Distribute protocol fees from protocol fee multisig.',
  },
};
