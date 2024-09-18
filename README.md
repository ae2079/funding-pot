# Funding Pot

## Terminology

Within the project the term `batch` refers to one instance of running a funding interval. That includes

- users contributing within a given time interval (= transferring collateral tokens to the safe)
- using these funds to buy from the bonding curve
- calculating the amounts of issuance tokens that contributors receive
- creating linear vestings for contributors

Note: this script does not cover the claiming of tokens by contributors

## Run the tests

### Prerequisites

- you have an ANKR API key
- you have two private keys whose addresses are funded with small amounts of testnet ETH on Base Sepolia

### Instructions

Copy `.env.example` to `.env.test` and fill in the values. In order to run all tests, you need to have an **ANKR API key** and specify **two private keys**. One key is associated with the **single owner of a Safe** and the other the key is associated with the role of a **delegate** who can **propose transactions** to that safe. You will require a small amount of _testnet ETH_ on Base Sepolia for both accounts. When running the e2e tests, the private keys will be used to setup an safe and workflow for your personal accounts that is used to test against.

### Unit tests

`npm run test:unit`

### End-to-end test

The `main.e2e.test.js` file is an end-to-end test that tests the whole flow from safe creation to vesting creation. Specifically it does the following steps:

- deploy a safe (via Safe's Protocol and API Kits)
- add the delegate to the safe
- deploy the workflow (via the Inverter SDK)
- make all inverter-related workflow configurations
- send some contributions to the safe (from owner and delegate)
- generate & save a project & batch config as well as an allowlist
- execute the funding pot script
- sign and execute the transactions from the safe (via Safe's Protocol and API Kits)

To just the end-to-end test use the following command:

`npm run test:e2e`

**NOTE:** Due to the number of transactions and API calls involved with this test, it regularly fails for wallet-related reasons (nonce issues). If this happens, you can try to run the test again.

### Cleanup

Since the end-to-end test uses some randomness for determining the contribution sizes, it can happen that both test contributors hit the 2% cap and don't qualify for joining the funding pot. In this case you can clean up the test data by running `npm run clean` and start from scratch.

This command will remove all auto-generated files from `/data` and allows you to generate new ones the next time you run the tests.

## Run the script

### Prerequisites

- you have an ANKR API key
- you have added the address associated with your delegate private key to the safe
- you have deployed and configured the workflow

### Instructions

Copy `.env.example` to `.env` and fill in the values. If the delegate has already been added to the Safe that you want to propose to, setting the `DELEGATE` private key is enough.

- add at least the delegate key (`DELEGATE`) to your `.env`
- add the ANKR API (`ANKR_API_KEY`) key to your `.env`
- make sure that `CHAIN_ID` and `ANKR_NETWORK_ID` are set to the correct values:

### Configuration options

There are three types of inputs that the script executor can take. They can all be found under `/data/production/input`.

1. `projects.json`: Contains on object where each key is a project name and each value is an object containing the safe address and the orchestrator address of the project. This file should be updated whenever a new project is added or an existing one is updated. There is an example file under `/data/test/input/projects.json`. If you run the tests for the first time, an additional project ("TESTPROJECT") will be added to `/data/test/input/projects.json`.
2. `allowlist.json`: Contains an array of addresses that are allowed to contribute to the safe. This file should be updated whenever a new address is added or an existing one is removed. If you run the tests for the first time, an example test file is generated in `/data/test/input/allowlist.json`.
3. `batches/<batchNr>.json`: For each batch, a JSON file needs to be added to the `batches` directory. The file contains the vesting timelines (start, cliff, end) for that batch and optionally the timeframe (fromTimestamp, toTimestamp) where contributions will be considered. If the timeframe is not specified, contributions will be considered from the start of

### Running the script

To run the script use the following command:

`npm run start <PROJECT_NAME> <BATCH_NUMBER>`

- `PROJECT_NAME`: the name of the project you want to run the script for; used to fetch project-specific configurations from `projects.json`
- `BATCH_NUMBER`: the batch number you want to run the script for; used to fetch batch-specific configurations from `batches/<BATCH_NUMBER>.json`

### Checking the script's output

When the script has executed a JSON report will be added under `data/production/output/<PROJECT_NAME>/<BATCH_NUMBER>.json`. You can use this file to better understand what has been proposed to the safe.

## Specification

In summary this project does three things:

1. Contributions: it records transfers of the funding token to a safe that occur within a given timeframe (= contributions)
2. Calculations: filters these transfers by eligibility (specified by KYC allowlist) and calculates the amount of reward tokens that will be vested to each contributor in return for contribution
3. Execution: assembles and proposes (via a delegate flow) multisend transactions to the safe to use contributions for buying reward tokens from the bonding curve and stream them to contributors

### Details on the calculation logic

- contributions per user per batch are capped
- how much a user can contribute is calculated as follows:
  1. calculate the token cap applicable to all contributors (cap = 2% of the total supply **before the new batch**)
  2. per contributor, check how many reward tokens the contributor already has (locked in vestings) **before the new batch**
  3. calculate difference between the token cap and the amount of reward tokens the contributor already has
  4. multiply the difference by the current spot price to get the amount of collateral tokens that the contributor can contribute
  5. invalid contributions are not used for buying reward tokens from the curve but retained by the safe
- example:
  - during last batch Alice contributed some amount
  - now the current total supply is 100, of which Alice owns 1 token (=1%)
  - the current spot price is 5 (collateral tokens per issuance token)
  - to calculate how much she can contribute in the ongoing batch the following approach is used
  - the max amount is defined by the 2% cap and the current total supply (100), resulting in an absolute cap per contributor of 2 tokens in this scenario
  - the basis for further calculations is the difference between what she currently owns (= 1 token) and the absolute cap (= 2 tokens)
  - this means in the ongoing batch Alice could buy up to one additional token to reach the cap
  - since we don't know how much total contributions we'll receive in the ongoing batch we don't know the effective price that Alice will pay per token (aka how much will this additional token cost her)
  - therefore we make a simplification for our calculation: we assume she will pay the current spot price
  - so for this example we tell her that she can contribute up to 5 collateral tokens

## Implementation details

### Assumptions

- all rewards paid out to contributors remain fully vested over the lifetime where this script is run

### Structure

```
.
├── data
│   ├── production
│   │   ├── input
│   │   └── output
│   └── test
│   ├── input
│   │   └── batches
│   └── output
│   └── TESTPROJECT
├── services
│   ├── Batch
│   ├── Queries
│   ├── Safe
│   └── TransactionBuilder
├── steps
│   ├── 01_loadInputs
│   ├── 02_validateInputs
│   ├── 03_instantiateServices
│   ├── 04_defineBatch
│   ├── 05_proposeBatch
│   └── 06_storeReport
└── utils
└── scripts
```

#### Data

- subdivided into `production` and `test`
- `input`: contains the user input data for the scripts
- `output`: per batch and project, a JSON report will be generated in this folder

#### Services

The services are where the most of the logic sits. All services are classes that store most of the outputs of their respective operations in state. This is then later used to generate the report.

- `Batch`: contains the logic for calculating who gets how many tokens
- `Queries`: contains the logic for querying external data sources
- `Safe`: contains the logic for interacting with the safe
- `TransactionBuilder`: contains the logic for generating transaction batches

#### Steps

The steps tie the services together and bring an order into the execution flow.

1. `loadInputs`: loads input parameters provided by the user as JSON files
2. `validateInputs`: validates the input parameters and environment variables
3. `instantiateServices`: instantiates the services using the input parameters and environment variables
4. `defineBatch`: defines the batch by calculating the contributions, eligibility, received allocations, vesting details etc.
5. `proposeBatch`: bundles all transactions into multisend transactions of 100 transactions each that are then proposed to the safe via the delegation mechanism
6. `storeReport`: services "log" their logic operations; this data is used to generate a json file that describes the batch
