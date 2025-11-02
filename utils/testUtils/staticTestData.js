export const batchConfig = {
  TIMEFRAME: {
    FROM_TIMESTAMP: 1726684518,
    TO_TIMESTAMP: 1726692378,
  },
  VESTING_DETAILS: {
    START: 0,
    CLIFF: 10,
    END: 100,
  },
  LIMITS: {
    TOTAL: '89',
    TOTAL_2: '90',
    INDIVIDUAL: '20',
    INDIVIDUAL_2: '2',
  },
  IS_EARLY_ACCESS: false,
  PRICE: '10',
};

export const projectConfig = {
  SAFE: '0x4ffe42c1666e50104e997DD07E43c673FD39C81d',
  ORCHESTRATOR: '0x49BC19af25056Db61cfB4035A23ce3B509DF46B3',
  NFT: '0xa47f284a5be76c10b902446acb1aea9550f4c71d',
};

export const addresses = {
  addr1: '0x6747772f37a4f7cfdea180d38e8ad372516c9548',
  addr2: '0xa6e12ede427516a56a5f6ab6e06dd335075eb04b',
  addr3: '0xcb1edf0e617c0fab6408701d58b746451ee6ce2f',
  addr4: '0xb4f8d886e9e831b6728d16ed7f3a6c27974abaa4',
  addr5: '0x5e657719aee21a6bb1bcaad7781dce222186ca72',
  addr6: '0x3cf0c87c79bc2119fe73853a475c1a194359d08c',
};

export const allowlist = [
  addresses.addr1,
  addresses.addr2,
  addresses.addr4,
  addresses.addr5,
  addresses.addr6,
];

export const inflows = [
  {
    participant: addresses.addr1,
    contribution: 2000000000000000000n,
    timestamp: 1726691908,
    transactionHash:
      '0x7d5b14cc482d201ef6b0803bc2fefeab805951e6d04817f64dc9ba35b9094ae0',
  },
  {
    participant: addresses.addr2,
    contribution: 2100000000000000000n,
    timestamp: 1726691938,
    transactionHash:
      '0x81bfc33fab4d3507f859e6b2593029752318f8790ac9109a8b1ebdf79d5ec38d',
  },
  {
    participant: addresses.addr1,
    contribution: 100000000000000000n,
    timestamp: 1726691956,
    transactionHash:
      '0xcd638b63fed26ac9e425813429a8e53e8e6b13bcc540362f888e033740973dd3',
  },
  {
    participant: addresses.addr3,
    contribution: 100000000000000000n,
    timestamp: 1726691978,
    transactionHash:
      '0xd043e97a233e96d9a8fd9001e21269a604b0b7f4e77ad58bd579c701b6308b09',
  },
  {
    participant: addresses.addr4,
    contribution: 9000000000000000000n,
    timestamp: 1726692048,
    transactionHash:
      '0xf73796e17e336e90c1341f311bf6718f99e6fede48bc197a164e0d7a0417da9c',
  },
  {
    participant: addresses.addr5,
    contribution: 1700000000000000000n,
    timestamp: 1726692172,
    transactionHash:
      '0x2a3696b34a801adfd8432337ed9dc7f66be648512cbe01da1c77c98cc115a7c7',
  },
  {
    participant: addresses.addr6,
    contribution: 3000000000000000000n,
    timestamp: 1726692190,
    transactionHash:
      '0xf83b09143f55fad1dbe15441ff738bc3d567f5cbdd1b0dabb3bdb3c9b48dcae9',
  },
];

export const batchReportConfig = {
  totalLimit: 9000000000000000000n,
  individualLimit: 2000000000000000000n,
  isEarlyAccess: false,
};

export const batchReportData = {
  aggregatedPreviousContributions: {},
  totalContribution: 18000000000000000000n,
  totalValidContribution: 9000000000000000000n,
  totalInvalidContribution: 9000000000000000000n,
  participants: {
    '0x6747772f37a4f7cfdea180d38e8ad372516c9548': {
      contribution: 2100000000000000000n,
      transactions: [
        {
          transactionHash:
            '0x7d5b14cc482d201ef6b0803bc2fefeab805951e6d04817f64dc9ba35b9094ae0',
          contribution: 2000000000000000000n,
          invalidContribution: 0n,
          validContribution: 2000000000000000000n,
        },
        {
          transactionHash:
            '0xcd638b63fed26ac9e425813429a8e53e8e6b13bcc540362f888e033740973dd3',
          contribution: 100000000000000000n,
          invalidContribution: 100000000000000000n,
          validContribution: 0n,
        },
      ],
      invalidContribution: 100000000000000000n,
      validContribution: 2000000000000000000n,
      participantLimit: 2000000000000000000n,
      issuanceAllocation: 10822300000000000000n,
    },
    '0xa6e12ede427516a56a5f6ab6e06dd335075eb04b': {
      contribution: 2100000000000000000n,
      transactions: [
        {
          transactionHash:
            '0x81bfc33fab4d3507f859e6b2593029752318f8790ac9109a8b1ebdf79d5ec38d',
          contribution: 2100000000000000000n,
          invalidContribution: 100000000000000000n,
          validContribution: 2000000000000000000n,
        },
      ],
      invalidContribution: 100000000000000000n,
      validContribution: 2000000000000000000n,
      participantLimit: 2000000000000000000n,
      issuanceAllocation: 10822300000000000000n,
    },
    '0xcb1edf0e617c0fab6408701d58b746451ee6ce2f': {
      contribution: 100000000000000000n,
      transactions: [
        {
          transactionHash:
            '0xd043e97a233e96d9a8fd9001e21269a604b0b7f4e77ad58bd579c701b6308b09',
          contribution: 100000000000000000n,
          invalidContribution: 100000000000000000n,
          validContribution: undefined,
        },
      ],
      invalidContribution: 100000000000000000n,
      validContribution: 0n,
    },
    '0xb4f8d886e9e831b6728d16ed7f3a6c27974abaa4': {
      contribution: 9000000000000000000n,
      transactions: [
        {
          transactionHash:
            '0xf73796e17e336e90c1341f311bf6718f99e6fede48bc197a164e0d7a0417da9c',
          contribution: 9000000000000000000n,
          invalidContribution: 7000000000000000000n,
          validContribution: 2000000000000000000n,
        },
      ],
      invalidContribution: 7000000000000000000n,
      validContribution: 2000000000000000000n,
      participantLimit: 2000000000000000000n,
      issuanceAllocation: 10822300000000000000n,
    },
    '0x5e657719aee21a6bb1bcaad7781dce222186ca72': {
      contribution: 1700000000000000000n,
      transactions: [
        {
          transactionHash:
            '0x2a3696b34a801adfd8432337ed9dc7f66be648512cbe01da1c77c98cc115a7c7',
          contribution: 1700000000000000000n,
          invalidContribution: 0n,
          validContribution: 1700000000000000000n,
        },
      ],
      invalidContribution: 0n,
      validContribution: 1700000000000000000n,
      participantLimit: 2000000000000000000n,
      issuanceAllocation: 9198900000000000000n,
    },
    '0x3cf0c87c79bc2119fe73853a475c1a194359d08c': {
      contribution: 3000000000000000000n,
      transactions: [
        {
          transactionHash:
            '0xf83b09143f55fad1dbe15441ff738bc3d567f5cbdd1b0dabb3bdb3c9b48dcae9',
          contribution: 3000000000000000000n,
          invalidContribution: 1700000000000000000n,
          validContribution: 1300000000000000000n,
        },
      ],
      invalidContribution: 1700000000000000000n,
      validContribution: 1300000000000000000n,
      participantLimit: 2000000000000000000n,
      issuanceAllocation: 7034500000000000000n,
    },
  },
  additionalIssuance: 48700550011355454828n,
};

export const nftHolders = [addresses.addr1, addresses.addr2];

export const mockCollateralToken =
  '0x668f5965c26e5df5e9917f0d7d3367c8d8433682';

// '0xC4d4598AE5843ed851D81F4E35E97cCCC4E25D80'; base sepolia

export const deployArgs = (admin, safe) => {
  return {
    orchestrator: {
      independentUpdates: false,
      independentUpdateAdmin:
        '0x0000000000000000000000000000000000000000',
    },
    authorizer: { initialAdmin: admin },
    fundingManager: {
      issuanceToken: '0x0000000000000000000000000000000000000000',
      bondingCurveParams: {
        formula: '0xaAA597779bdbC7D54836FCdDDd38690787d04d6d',
        buyFee: '50',
        sellFee: '50',
        reserveRatioForBuying: 333_333,
        reserveRatioForSelling: 333_333,
        buyIsOpen: true,
        sellIsOpen: true,
        initialIssuanceSupply: '200002.999999999999998676',
        initialCollateralSupply: '296.306333665498798599',
      },
      collateralToken: mockCollateralToken,
    },
    issuanceToken: {
      name: 'ABC TOKEN',
      symbol: 'ABC',
      decimals: 18,
      maxSupply:
        '11579208923731619542357098500868790785326998466564056403945',
    },
    beneficiary: safe,
  };
};

export const requestedModules = {
  fundingManager:
    'FM_BC_Restricted_Bancor_Redeeming_VirtualSupply_v1',
  paymentProcessor: 'PP_Streaming_v1',
  authorizer: 'AUT_Roles_v1',
  optionalModules: ['LM_PC_PaymentRouter_v1'],
};

export const restrictedPimFactory =
  '0x69891b6FF840999A165569eBA13C2aFdbCcFAB31';

export const projectConfigWithWrapper = {
  SAFE: '0x23A9afdA8301D2C4bBdA1f0bC1B990E8515647a1',
  ORCHESTRATOR: '0xb6FDAf84C2302cfc2afFA8A5DCfBE2a0d4Df4346',
  NFT: '0xa47f284a5be76c10b902446acb1aea9550f4c71d',
};

export const batchConfigWithWrapper = {
  VESTING_DETAILS: {
    START: '1729109380',
    CLIFF: '60',
    END: '1729109440',
  },
  TIMEFRAME: {
    FROM_TIMESTAMP: '1729109320',
    TO_TIMESTAMP: '1729109460',
  },
  LIMITS: {
    INDIVIDUAL: '5000',
    INDIVIDUAL_2: '500',
    TOTAL: '15000',
    TOTAL_2: '15500',
  },
  PRICE: '0.1',
  IS_EARLY_ACCESS: false,
};

export const batchReportDataWithWrapper = {
  aggregatedPreviousContributions: {},
  totalContribution: 1531561862296063049728n,
  totalValidContribution: 1531561862296063049728n,
  totalInvalidContribution: 0n,
  participants: {
    '0x6747772f37a4f7cfdea180d38e8ad372516c9548': {
      contribution: 926281572697310363648n,
      transactions: [
        {
          transactionHash:
            '0x3ae8aa7e96968767f316f6af8a806bd37c40d08f4f576bcd7de16e4f63958d40',
          contribution: 926281572697310363648n,
          invalidContribution: 0n,
          validContribution: 926281572697310363648n,
          invalidReason: undefined,
        },
      ],
      invalidContribution: 0n,
      validContribution: 926281572697310363648n,
      participantLimit: 50000000000000000000000n,
      issuanceAllocation: 40274062200000000000000n,
    },
    '0xa6e12ede427516a56a5f6ab6e06dd335075eb04b': {
      contribution: 605280289598752686080n,
      transactions: [
        {
          transactionHash:
            '0x873905857c55809683694626f1f87b5c3a4cb78ec06bf0b38aae5fe41dbb825d',
          contribution: 605280289598752686080n,
          invalidContribution: 0n,
          validContribution: 605280289598752686080n,
          invalidReason: undefined,
        },
      ],
      invalidContribution: 0n,
      validContribution: 605280289598752686080n,
      participantLimit: 50000000000000000000000n,
      issuanceAllocation: 26317155300000000000000n,
    },
  },
  additionalIssuance: 66591217695239318137954n,
};
