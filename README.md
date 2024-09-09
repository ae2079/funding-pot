# Funding Pot

## Running tests

### Prerequisites

Copy `.env.example` to `.env.test` and fill in the values. In order to run all tests, you need to have an **ANKR API key** and specify **two private keys**. One key is associated with the single owner of a Safe and the other the key is associated with the role of a delegate who can propose transactions to that safe. You will require a small amount of testnet ETH on Base Sepolia for both accounts.

### Running all tests

`npm run test`

### End-to-end test

The `00_main.test.js` file is an end-to-end test that tests the whole flow from safe creation to vesting creation. Specifically it does the following steps:

- deploy a safe (via Safe's Protocol and API Kits)
- add the delegate to the safe
- deploy the workflow (via the Inverter SDK)
- make all inverter-related workflow configurations
- send some contributions to the safe (from owner and delegate)
- generate & save a project & batch config as well as an allowlist
- execute the funding pot script
- sign and execute the transactions from the safe (via Safe's Protocol and API Kits)

To just the end-to-end test use the following command:

`npm run test steps/00_main.test.js`

## Run the script

### Pre-Conditions

- you have an ANKR API key
- you have added the address associated with your delegate private key to the safe
- you have deployed and configured the workflow

### Env Variables

- add at least the delegate key (`DELEGATE`) to your `.env`
- add the ANKR API (`ANKR_API_KEY`) key to your `.env`
- make sure that `CHAIN_ID` and `ANKR_NETWORK_ID` are set to the correct values:

### Configuration options

There are three types of inputs that the script executor can take. They can all be found under `/data/production/input`.

1. `projects.json`: Contains on object where each key is a project name and each value is an object containing the safe address and the orchestrator address of the project. This file should be updated whenever a new project is added or an existing one is updated. If you run the tests for the first time, an example test file is generated in `/data/test/input/projects.json`.
2. `allowlist.json`: Contains an array of addresses that are allowed to contribute to the safe. This file should be updated whenever a new address is added or an existing one is removed. If you run the tests for the first time, an example test file is generated in `/data/test/input/allowlist.json`.
3. `batches/<batchNr>.json`: For each batch, a JSON file needs to be added to the `batches` directory. The file contains the vesting timelines (start, cliff, end) for that batch and optionally the timeframe (fromTimestamp, toTimestamp) where contributions will be considered. If the timeframe is not specified, contributions will be considered from the start of
