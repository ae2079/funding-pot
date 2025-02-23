# Setup on PoS

## Factory

deployer address: 0xB4f8D886E9e831B6728D16Ed7F3a6c27974ABAA4
nonce: 6
deployed factory address: 0x5f3d29e225def9959a638423f01361af4300fdb2

## Tokens

cap: 115792089237316195423570985008687907853269984665640564039457584007913129639935

### X23

name: x23.ai
symbol: X23
address: 0xc530b75465ce3c6286e718110a7b2e2b64bdc860
creation nonce: 17
deployed at: 0xc530B75465Ce3c6286e718110A7B2e2B64Bdc860
mint wrapper: 0x594a6257a477C6fd15f0dF56d1d319985197c1b0
supply: 7196281822091173492469549

### Akarun

name: AKA
symbol: AKA
address: 0xa3dd6163b5742b0d8cb7d79cb5dfe3f81f8f8fc4
creation nonce: 19
deployed at: 0xA3dd6163B5742B0D8Cb7d79CB5DFE3F81F8F8fC4
mint wrapper: 0x6941344942418FE8B58C98d24C8212DebE599935
supply: 6535123958086381057419686

### CTZN Wallet

name: Citizen Wallet
symbol: CTZN
address: 0x0D9B0790E97e3426C161580dF4Ee853E4A7C4607
creation nonce: 21
deployed at: 0x0D9B0790E97e3426C161580dF4Ee853E4A7C4607
mint wrapper: 0x0c2350F5A6F1FFC436524FAd2FAfA5dFB551f15c
supply: 6971346272391768997608927

### Melodex

name: Melodex
symbol: MELS
address: 0x5fdaf637aed59b2e6d384d9e84d8ac5cf03c6697
creation nonce: 23
deployed at: 0x5FDAF637Aed59B2e6d384d9e84D8ac5cF03c6697
mint wrapper: 0x4b91a94a6Fd6004Df100415D9D66FE3eD377F163
supply: 6502511744323686524013484

### The Grand Timeline

name: The Grand Timeline
symbol: GRNDT
address: 0xfafb870f1918827fe57ca4b891124606eaa7e6bd
creation nonce: 25
deployed at: 0xfAFB870F1918827fe57Ca4b891124606EaA7e6bd
mint wrapper: 0x793Aa2517656F1dFd528F41000EFE9d4175C917E
supply: 6666525065538717183532024

### Ancient Beast

name: BEAST
symbol: BEAST
address: 0x4191f84f66e0b7cc10370ff47a0e2168e35b9bdf
creation nonce: 27
deployed at: 0x4191f84f66e0b7cc10370ff47a0e2168e35b9bdf
mint wrapper: 0xF13e2BC8Bd790389E10937B5F02229dBb133f289
supply: 6498673480706136756356790

### Prismo Technology

name: Prismo Technology
symbol: PRSM
address: 0x0b7a46e1af45e1eaadeed34b55b6fc00a85c7c68
creation nonce: 29
deployed at: 0x0b7a46e1af45e1eaadeed34b55b6fc00a85c7c68
mint wrapper: 0xC4A7708Fa636bc21364d32B02Cff9164016d9De1
supply: 6812079813100204862117627

### Xade Finance

name: Alpha Chad
symbol: ACHAD
address: 0xa1a78ac9884adc9d04d59b2b743f1ec709618e55
creation nonce: 35
deployed at: 0xa1a78ac9884adc9d04d59b2b743f1ec709618e55
mint wrapper: 0x89B24B875B1Ab4d5da96201cD0684433F6539881
supply: 6805724119834433803230711

## Checklist

### Target Chain

MELODEX: 19/02/2025

**Permissions**

- [x] workflow admin from config is workflow admin (workflow admin multisig: `0x9298fD550E2c02AdeBf781e08214E4131CDeC44e`)
- [x] workflow admin from config is owner of token wrapper contract (`0x9298fD550E2c02AdeBf781e08214E4131CDeC44e`)
- [x] dev is workflow admin (`0xB4f8D886E9e831B6728D16Ed7F3a6c27974ABAA4`); _to be removed after grace period_
- [x] dev is owner of token (`0xB4f8D886E9e831B6728D16Ed7F3a6c27974ABAA4`); _to be removed after grace period_

- [x] dev not set as minter anymore on wrapper
- [x] bonding curv module is set as minter on wrapper
- [x] wrapper is set as minter on token

- [x] funding pot multisig has CURVE_INTERACTION_ROLE (can buy/sell from bonding curve)
- [x] & PAYMENT_PUSHER_ROLE (can create vestings)

**Token**

- [x] issuance token deployed on same address on zkevm and target chain

- [x] same holder distribution as on zkevm

  - [x] payment router address is swapped against new deployment address on target chain
  - [x] other addresses are the same on zkevm and target chain (FP MS and Protocol Fee MS)

- [x] vestings (sanity check via indexer)

  - [x] compare one vesting with one on zkevm and target chain
  - [x] same number of vestings on zkevm and target chain

**ABC**

- [x] ABC config matches on zkevm and target chain

# Closedown on zkevm

## Checklist

- [ ] all ABC tokens have been burned (supply == 0)
- [ ] the workflows dont have an admin anymore
- [ ] the collateral is withdrawn to the admin multisig
