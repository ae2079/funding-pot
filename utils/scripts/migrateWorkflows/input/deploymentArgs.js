const WPOL =
  process.env.NODE_ENV === 'production'
    ? '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270' // WPOL on Polygon
    : '0xA5733b3A8e62A8faF43b0376d5fAF46E89B3033E'; // WPOL on Amoy

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
    collateralToken: WPOL,
  },
});

export const adminMultisig =
  '0x9298fD550E2c02AdeBf781e08214E4131CDeC44e';
