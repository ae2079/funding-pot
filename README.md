# Funding Pot

## Quickstart

1. Get an ankr api key [here](<[here](https://www.ankr.com/rpc/advanced-api/)>)
2. Fund two accounts with testnet ETH on Base Sepolia
3. Copy the `.env.example` file to `.env.test` and fill in the api key as well as the two private keys
4. Run `npm install`
5. Run `npm run test:e2e`
6. Check the following files for the results:

- inputs:
  - batchConfig (to be set per batch): `data/test/input/batches/s1/3.json`
    **NOTE**: subdivided by seasons, where s1 refers to season 1
  - projects (to be set once): `data/test/input/projects.json` (=> `GENERATED_TEST_PROJECT`)
- outputs:
  - batchReport: `data/test/output/GENERATED_TEST_PROJECT/3.json`

## Terminology

Within the project the term `batch` refers to one instance of running a funding interval. That includes

- users contributing within a given time interval (= transferring collateral tokens to the safe)
- using these funds to buy from the bonding curve
- calculating the amounts of issuance tokens that contributors receive
- creating linear vestings for contributors

Note: this script does not cover the claiming of tokens by contributors

## Installation

Clone the repository and install the dependencies:

`git clone https://github.com/InverterNetwork/funding-pot.git && cd funding-pot && npm install`

Next you will have to set some environment variables.

## Run the tests

### Prerequisites

- you have an ANKR API key for their "advanced API" (get one [here](https://www.ankr.com/rpc/advanced-api/))
- you have two private keys whose addresses are funded with small amounts of testnet gas tokens

### Instructions

Copy `.env.example` to `.env.test` and fill in the values. In order to run all tests, you need to have an **ANKR API key** and specify **two private keys**. One key is associated with the **single owner of a Safe** and the other the key is associated with the role of a **delegate** who can **propose transactions** to that safe. If the delegation mechanism is configured to be disabled, the second address will only be used to emulate a second contributor to a test funding round You will require a small amount of _testnet ETH_ for both accounts. When running the e2e tests, the private keys will be used to setup an safe and workflow for your personal accounts that is used to test against.

### End-to-end test

**Prerequisites**:

- hold a small amount of wrapped native tokens in the wallet associated with the PK of the .env

The `main.e2e.test.js` file is an end-to-end test that tests the whole flow from safe creation to vesting creation. Specifically it does the following steps:

- deploy a safe (via Safe's Protocol and API Kits)
- deploy the workflow (via the [Inverter SDK](https://github.com/InverterNetwork/sdk))
- make all inverter-related workflow configurations
- send some contributions to the safe from the owner and delegate accounts (using the native token)
- generate & save a project & batch config
- execute the funding pot script

By running this test, you will be able to understand the input parameters that the script requires, as well as the output that it produces.

To just the end-to-end test use the following command:

`npm run test:e2e`

**NOTE:** Due to the number of transactions and API calls involved with this test, it regularly fails for wallet-related reasons (nonce issues). If this happens, you can try to run the test again.

### Cleanup

Since the end-to-end test uses some randomness for determining the contribution sizes, it can happen that both test contributors hit the 2% cap and don't qualify for joining the funding pot. In this case you can clean up the test data by running `npm run clean` and start from scratch.

This command will remove all auto-generated files from `/data` and allows you to generate new ones the next time you run the tests.

## Run the script

### Prerequisites

- you have an ANKR API key
- you have added the address associated with your delegate private key as delegate to the safe (you can also do this via [this](https://gnosis-safe-delegate-dapp-nine.vercel.app/) UI)
- you have deployed and configured the workflow
- you have deployed the NFT contract used for the early access round

### Instructions

Copy `.env.example` to `.env` and fill in the values. If the delegate has already been added to the Safe that you want to propose to, setting the `DELEGATE` private key is enough.

- add at least the delegate key (`DELEGATE`) to your `.env`
- add the ANKR API (`ANKR_API_KEY`) key to your `.env`
- make sure that `CHAIN_ID` and `ANKR_NETWORK_ID` are set to the correct values

### Configuration options / Inputs

There are three types of inputs that the script executor can take. They can all be found under `/data/production/input`.

1. `projects.json`: Contains on object where each key is a project name and each value is an object containing the safe address and the orchestrator address of the project, the NFT contract address associated with the early access round, and the amount of collateral tokens to be used as matching funds. This file should be updated whenever a new project is added or an existing one is updated. There is an example file under `/data/test/input/projects.json`. If you run the tests for the first time, an additional project ("GENERATED_TEST_PROJECT") will be added to `/data/test/input/projects.json`.

Nested under the key `BATCH_CONFIGS` you need - surprise - to put the batch config. The key corresponds to the batch number.

**Example:**

```json
{
  "SOME_PROJECT": {
    "SAFE": "0x0000000000000000000000000000000000000000",
    "ORCHESTRATOR": "0x0000000000000000000000000000000000000001",
    "NFT": "0x0000000000000000000000000000000000000002",
    "BATCH_CONFIGS:" {
      "3": {
        "VESTING_DETAILS": {
          "START": "1726861746", // vesting start in unix time
          "CLIFF": "60", // seconds until cliff from start
          "END": "1726861806" // vesting end in unix time
        },
        "TIMEFRAME": {
          "FROM_TIMESTAMP": "1726861686", // start timestamp
          "TO_TIMESTAMP": "1726861818" // end timestamp => between these timestamps users can contribute
        },
        "LIMITS": {
          "INDIVIDUAL": "2000", // individual contribution limit in dollar; for the EA and QACC round this corresponds to the cap for zkID users
          "INDIVIDUAL_2": "250", // ONLY REQUIRED FOR QACC ROUND: individual contribution limit in dollar for GTCPass users
          "TOTAL": "1500" // batch limit in dollar
        },
        "IS_EARLY_ACCESS": false, // if its an early access round (true) or a qacc round (false),
        "PRICE": "0.1", // assumed dollar price per collateral token for that batch,
        "MATCHING_FUNDS": "420.69" // ONLY REQUIRED FOR QACC ROUND: amount of collateral tokens to be used as matching funds; e.g. 420.69 POL coming from the matching pool
      }
    }
  },
  "ANOTHER_PROJECT": {
    "SAFE": "0x0000000000000000000000000000000000000003",
    "ORCHESTRATOR": "0x0000000000000000000000000000000000000004",
    "NFT": "0x0000000000000000000000000000000000000005",
    "MATCHING_FUNDS": "420.69",
    "BATCH_CONFIGS:" {
      "1": {
        ...
      },
      "2": {
        ...
      }
    }
  },
  }
}
```

### Running the script

#### For a single project

To run the script for one project use the following command:

`npm run project <SEASON> <PROJECT_NAME> <BATCH_NUMBER>`

- `SEASON`: the season you want to run the script for; used to fetch season-specific configurations from `batches/<SEASON>/<BATCH_NUMBER>.json`
- `PROJECT_NAME`: the name of the project you want to run the script for; used to fetch project-specific configurations from `projects.json`
- `BATCH_NUMBER`: the batch number you want to run the script for; used to fetch batch-specific configurations from `batches/<SEASON>/<BATCH_NUMBER>.json`

**Example:**

The following command will run the script for the 2nd batch of the project `FUNKY_FOXES` in season 3:

`npm run project 3 "FUNKY_FOXES" 2`

### Checking the script's output

When the script has executed a JSON report will be added under `data/production/output/<PROJECT_NAME>/<BATCH_NUMBER>.json`. You can use this file to better understand what has been proposed to the safe.

**Running the script will store a json to data/<environment>/output/transactions that can then be executed in the safe UI.**

## Running the vesting script

### Pre-requisites

- the `data/production/input/projects.json` file is set
- all environment variables are set that are also required for the funding pot script
- the total amount of vesting tokens has been sent to the payment router

### Necessary steps

1. set the `vestings.json` file under `/utils/scripts/inputs/vestings.json`

NOTE: there is an example file set (`vestings.example.json`), which you can use as reference.

The following is an example. Note that all projects share the same vesting details and each key in in `VESTINGS` corresponds to a project name. These need to be the same project names as in the `projects.json` file. Associated with each project is an array of vestings, where the recipient is the address that will receive the vesting and the amount is the amount of tokens that will be vested.

```json
{
  "VESTING_DETAILS": {
    "START": 1,
    "END": 3,
    "CLIFF": 1
  },
  "VESTINGS": {
    "GENERATED_TEST_PROJECT": [
      {
        "recipient": "0x6747772f37a4F7CfDEA180D38e8ad372516c9548",
        "amount": "420000000000000000000"
      },
      {
        "recipient": "0xa6e12EDe427516a56a5F6ab6e06dD335075eb04b",
        "amount": "69000000000000000000"
      }
    ],
    "GENERATED_TEST_PROJECT_2": [
      {
        "recipient": "0x6747772f37a4F7CfDEA180D38e8ad372516c9548",
        "amount": "420000000000000000000"
      },
      {
        "recipient": "0xa6e12EDe427516a56a5F6ab6e06dD335075eb04b",
        "amount": "69000000000000000000"
      }
    ]
  }
}
```

2. **per project** run the script with `npm run vestings <PROJECT_NAME>`

```

npm run vesting:project <project_name>

```

This will create and store a transaction json. The command needs to be repeated for each project.

## Setting up Roles (claiming tributes)

### Running the script

**Prerequisites**:

1. Set up the roles config in utils/scripts/inputs/roles.json

The following is an example. Note that all projects share the same vesting details and each key in in `VESTINGS` corresponds to a project name. These need to be the same project names as in the `projects.json` file. There is one workflow admin for all projects. That is the workflow admin multisig set upon deployment as `initialAdmin`.Associated with each project is a `feeClaimer` and a `feeRecipient`. The `feeClaimer` is the address that will be able to claim the tributes from the safe. The `feeRecipient` is the address that will receive the tributes.

```json
{
  "workflowAdmin": "0x...",
  "projects": {
    "GENERATED_TEST_PROJECT": {
      "feeClaimer": "0x...",
      "feeRecipient": "0x..."
    },
    "<PROJECT_NAME_2>": {
      "feeClaimer": "0x...",
      "feeRecipient": "0x..."
    }
  }
}
```

2. **Per project** run the script with `npm run roles:project <PROJECT_NAME>`

This will save a transaction JSON to transactions folder. The json needs to be dropped in the Safe UI and confirmed by the workflow admin multisig.

## Distribute Protocol Fees Script

This script facilitates the distribution of accumulated ERC20 tokens and the native blockchain token from a central fee collector multisig to a predefined list of recipients based on specified shares.

### Purpose

The script performs the following actions:

1.  Connects to the specified blockchain via an RPC URL.
2.  Optionally, fetches current balances of configured ERC20 tokens and the native token held by the `feeCollectorMs`.
3.  Calculates the amount of each token to be distributed to each recipient according to their defined share.
4.  Generates Gnosis Safe compatible transaction JSON files for these transfers. These files can then be uploaded to the Gnosis Safe UI to execute the distributions.
5.  Handles batching of transactions if the total number of transfers exceeds the configured `batchSize`.

### Configuration

The script's behavior is controlled by the `utils/scripts/distributeProtocolFees/config.js` file. Key configuration options include:

- `feeCollectorMs`: (String) The address of the Gnosis Safe multisig wallet that holds the fees to be distributed.
- `tokens`: (Array of Strings) A list of ERC20 token contract addresses that the script should attempt to distribute.
- `recipients`: (Array of Objects) Defines who receives the fees and their respective shares. Each object should have:
  - `name`: (String) A descriptive name for the recipient.
  - `address`: (String) The recipient's blockchain address.
  - `share`: (Number) The proportion of fees this recipient should receive (e.g., `0.6` for 60%). The sum of shares for all recipients should ideally be 1.0 for full distribution.
- `rpcUrl`: (String) The URL of the RPC provider for the blockchain network (e.g., `https://1rpc.io/matic`).
- `chainId`: (String) The chain ID of the network (e.g., `"137"` for Polygon Mainnet).
- `batchSize`: (Number) The maximum number of individual transfer transactions to include in a single Gnosis Safe JSON file. Default is `100`.
- `distributeNativeToken`: (Boolean) Set to `true` to enable distribution of the native blockchain token (e.g., ETH, MATIC), or `false` to disable it.
- `nativeTokenSymbol`: (String) The symbol of the native token (e.g., `"MATIC"`). Used for logging.
- `transactionMeta`: (Object) Contains metadata for the generated transaction files:
  - `namePrefix`: (String) A prefix used in the output JSON `meta.name` field and filename (e.g., `"Fee Distribution"`).
  - `description`: (String) A description for the transaction batch.

**Example `config.js` snippet:**

```javascript
// utils/scripts/distributeProtocolFees/config.js
export const config = {
  feeCollectorMs: '0x7022CE36B265cAcD497b2d3AC70fB7020d3892a6',
  tokens: [
    '0x6fc91fbe42f72941486c98d11724b14fb8d18b36', // Example Token 1
    // ... more token addresses
  ],
  recipients: [
    { name: 'QACC', address: '0x...', share: 0.6 },
    { name: 'Inverter', address: '0x...', share: 0.3 },
    // ... more recipients
  ],
  rpcUrl: 'https://1rpc.io/matic',
  chainId: '137',
  batchSize: 100,
  distributeNativeToken: true,
  nativeTokenSymbol: 'MATIC',
  transactionMeta: {
    namePrefix: 'Fee Distribution',
    description: 'Distribute protocol fees from the main multisig.',
  },
};
```

### Running the Script

To execute the script, navigate to the project's root directory and run:

```bash
npm run distribute-fees
```

This command will run the script with `NODE_ENV` set to `production` by default, causing output files to be saved in `data/production/transactions/`.

If you need to run the script for a different environment (e.g., to output files to `data/development/transactions/`), you can still override the `NODE_ENV` variable when invoking the script:

```bash
NODE_ENV=development npm run distribute-fees
```

### Output

The script generates one or more Gnosis Safe transaction JSON files in the `data/{NODE_ENV}/transactions/` directory.
The naming convention for these files is:

- `[FEE_DISTRIBUTION]-{timestamp}.json` (if only one file is generated)
- `[FEE_DISTRIBUTION]-{timestamp}-{index}.json` (e.g., `[FEE_DISTRIBUTION]-1678886400000-1.json`, `[FEE_DISTRIBUTION]-1678886400000-2.json`) if multiple files are generated due to `batchSize`.

The `{timestamp}` is a Unix millisecond timestamp from the time the script was run. The `{index}` is a 1-based counter for multiple files from the same run.

These JSON files can be uploaded to the Gnosis Safe interface to propose and execute the fee distribution transactions.

### Important Notes

- **Environment Configuration**: The script relies on the `NODE_ENV` environment variable to determine the output directory for transaction files (e.g., `data/production/transactions/` or `data/development/transactions/`). Ensure this is set appropriately before running.
- **RPC URL and Chain ID**: For the script to fetch live on-chain data (like token balances and decimals), the `rpcUrl` and `chainId` in `config.js` must be correctly set to valid values. If placeholder values are used (e.g., `'YOUR_RPC_PROVIDER_URL_PLACEHOLDER'`), the script will skip blockchain interactions and assume zero balances for all tokens, though it will still generate transaction JSONs based on this assumption.
- **Token Decimals**: The script attempts to fetch ERC20 token decimals on-chain. If this fails or if blockchain interactions are skipped, it defaults to 18 decimals. Native token distributions always assume 18 decimals.

## Technical Specification

In summary this project does three things:

1. Contributions: it records transfers of the funding token to a safe that occur within a given timeframe (= contributions)
2. Calculations: filters these transfers by eligibility (specified by allowlist & NFT holdings) and calculates the amount of reward tokens that will be vested to each contributor in return for contribution
3. Execution: assembles and proposes (via a Safe delegate flow) multisend transactions to the safe to use contributions for buying reward tokens from the bonding curve and stream them to contributors

### Details on the calculation logic

- contributions per user per batch are capped
- how much a user can contribute is calculated as follows:
  1. the batch config (`/input/batches/s<season>/<batchNr>.json`) specifies the amount of collateral tokens that a user can contribute per batch
  2. the batch config also specifies a total cap on the batch and if this cap is reached the batch is closed
  3. the unfilled total cap carries over to the next batch (the individual cap doesn't)

## Implementation details

### Structure

#### Data

- subdivided into `production` and `test`
- `input`: contains the user input data for the scripts
- `output`: per batch and project, a JSON report will be generated in this folder

```

.
├── README.md
├── config.js
└── data
  ├── abis.js
  ├── test
  └── production
    ├── input
    │   ├── batches
    │   │   ├── s1
    │   │   │   ├── 1.json
    │   │   │   ├── 2.json
    │   │   │   └── 3.json
    │   │   └── s2
    │   │       ├── 1.json
    │   │       ├── 2.json
    │   │       └── 3.json
    │   └── projects.json
    └── output
        ├── GENERATED_TEST_PROJECT
        │   ├── 1.json
        │   ├── 2.json
        │   └── 3.json
        ├── STATIC_TEST_PROJECT_1
        └── STATIC_TEST_PROJECT_2
            ├── 1.json
            └── 2.json
```

#### Services

The services are where the most of the logic sits. All services are classes that store most of the outputs of their respective operations in state. This is then later used to generate the report.

- `Batch`: contains the logic for calculating who gets how many tokens
- `Queries`: contains the logic for querying external data sources
- `Safe`: contains the logic for interacting with the safe
- `TransactionBuilder`: contains the logic for generating transaction batches

```

├── env.js
├── index.js
├── package-lock.json
├── package.json
└── services
  ├── Batch
  │ ├── Batch.js
  │ └── Batch.test.js
  ├── Queries
  │ ├── Queries.js
  │ ├── Queries.test.js
  │ └── queryBuilder.js
  ├── Safe
  │ ├── Safe.js
  │ └── Safe.test.js
  └── TransactionBuilder
    ├── TransactionBuilder.js
    └── TransactionBuilder.test.js

```

#### Steps

The steps tie the services together and bring an order into the execution flow.

1. `loadInputs`: loads input parameters provided by the user as JSON files as well as environment variables
2. `validateInputs`: validates the input parameters and environment variables
3. `instantiateServices`: instantiates the services using the input parameters and environment variables
4. `defineBatch`: defines the batch by calculating the contributions, eligibility, received allocations, vesting details etc.
5. `proposeBatch`: bundles all transactions into batched multisend transactions that are then proposed to the safe via the delegation mechanism (tx batch size is defined in `config.js`)
6. `storeReport`: services "log" their logic operations; this data is used to generate a `report` json file that describes the batch

```

├── steps
│ ├── 01_loadInputs
│ │ ├── 01_loadInputs.js
│ │ └── 01_loadInputs.test.js
│ ├── 02_validateInputs
│ │ ├── 02_validateInputs.js
│ │ └── 02_validateInputs.test.js
│ ├── 03_instantiateServices
│ │ ├── 03_instantiateServices.js
│ │ └── 03_instantiateServices.test.js
│ ├── 04_defineBatch
│ │ ├── 04_defineBatch.js
│ │ └── 04_defineBatch.test.js
│ ├── 05_proposeBatch
│ │ ├── 05_proposeBatch.js
│ │ └── 05_proposeBatch.test.js
│ ├── 06_storeReport
│ │ └── 06_storeReport.js
│ ├── main.e2e.test.js
│ └── main.js
└── utils
├── helpers.js
├── scripts
│ ├── addDelegate.js
│ └── resetTestFiles.js
└── testUtils
├── staticTestData.js
├── testHelpers.js
└── unitTestRunner.js

```

```

```
