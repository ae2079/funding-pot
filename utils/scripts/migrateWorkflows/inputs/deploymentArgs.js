export const getDeployArgs = (
  deployer,
  issuanceToken,
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
    issuanceToken: issuanceToken,
    bondingCurveParams: {
      formula: '0xfaf6c989dB0582D7b31e40343dd4A41a1848E038',
      reserveRatioForBuying: 125000,
      reserveRatioForSelling: 125000,
      buyFee: '800',
      sellFee: '800',
      buyIsOpen: true,
      sellIsOpen: true,
      initialIssuanceSupply: virtualIssuanceSupply,
      initialCollateralSupply: virtualCollateralSupply,
    },
    collateralToken: '0x5deac602762362fe5f135fa5904351916053cf70',
  },
});
