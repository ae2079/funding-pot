# Tutorials

## Associated user flows done in the Safe UI

### General

In order to do custom transactions within the Safe UI, you need to follow these steps:

1. Start new transaction process
<img width="1710" alt="Screenshot 2024-10-15 at 23 59 15" src="https://github.com/user-attachments/assets/b2b51701-9fb0-4711-bd4b-7b5223100b9a">

2. Choose the transaction builder
<img width="1710" alt="Screenshot 2024-10-16 at 00 05 41" src="https://github.com/user-attachments/assets/28ef60dd-2b59-4553-947f-840d01324310">

### Adding funding for a launch

*As the **grant multisig**, I want to add a grant to the deployment factory, so that it can be used by the grant-receiving project.*

#### Step 1: Approve spending of POL by factory

1. Paste the token address into the address field; this should trigger the UI to display available functions in the bottom of the page; if not paste the following into the `Enter ABI` field:
```
[
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  }
]
```

2. Choose `approve` and enter the parameters
     - `spender`: the address of the deployment factory (`Restricted_PIM_Factory_v1` can be obtained [here per chain id](https://github.com/InverterNetwork/deployments/blob/main/deployments/v1.0.0.json))
     - `amount`: the initial collateral supply; don't forget to convert into the correct units; POL is using 18 decimals so you can convert from ETH into WEI via [this](https://eth-converter.com/) tool
<img width="1710" alt="Screenshot 2024-10-16 at 00 23 39" src="https://github.com/user-attachments/assets/230f8a06-4a31-4fe3-8ecb-89b6ef29ecd9">

3. Add transaction

#### Step 2: Add funding to factory

1. Paste address of deployment factory (`Restricted_PIM_Factory_v1` can be obtained [here per chain id](https://github.com/InverterNetwork/deployments/blob/main/deployments/v1.0.0.json)); Pasting the address should trigger the UI to change and display the different functions in the bottom of the page; If not paste the following block into the ABI section.
```
{
  "type": "function",
  "name": "addFunding",
  "inputs": [
    {
      "name": "actor",
      "type": "address",
      "internalType": "address"
    },
    {
      "name": "token",
      "type": "address",
      "internalType": "address"
    },
    {
      "name": "amount",
      "type": "uint256",
      "internalType": "uint256"
    }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
}
```
<img width="1709" alt="Screenshot 2024-10-16 at 00 11 34" src="https://github.com/user-attachments/assets/5b8576bb-653a-4f69-84d0-81e51888313d">

2. Choose `addFunding` and fill the parameters
   - `actor`: is the address of the **funding pot multisig** of the project that is meant to consume the funding
   - `token`: is the address of the collateral token **POL**
   - `amount`: is the initial collateral supply; don't forget to convert into the correct units; POL is using 18 decimals so you can convert from ETH into WEI via [this](https://eth-converter.com/) tool

3. Add transaction
