export const getDeployArgs = (
  deployer,
  wrapper,
  virtualIssuanceSupply,
  virtualCollateralSupply
) => ({
  orchestrator: {
    independentUpdates: false,
    independentUpdateAdmin:
      '0x0000000000000000000000000000000000000000',
  },
  authorizer: {
    initialAdmin: deployer,
  },
  fundingManager: {
    issuanceToken: wrapper,
    bondingCurveParams: {
      formula:
        process.env.NODE_ENV === 'production'
          ? '0xaAA597779bdbC7D54836FCdDDd38690787d04d6d'
          : '0xfaf6c989dB0582D7b31e40343dd4A41a1848E038',
      reserveRatioForBuying: 125000,
      reserveRatioForSelling: 125000,
      buyFee: '800',
      sellFee: '800',
      buyIsOpen: true,
      sellIsOpen: true,
      initialIssuanceSupply: virtualIssuanceSupply,
      initialCollateralSupply: virtualCollateralSupply,
    },
    collateralToken:
      process.env.NODE_ENV === 'production'
        ? '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'
        : '0xfaf6c989dB0582D7b31e40343dd4A41a1848E038',
  },
});

export const adminMultisig =
  '0x44a0eBe19A93C801AD97F308672fdc7B110B2128';
