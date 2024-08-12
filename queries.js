export const queries = {
  indexer: {
    lastBuyBlocknumber: (address) => {
      return `
    {
        Swap(
            where: {initiator: {_eq: "${address}"}, swapType: {_eq: "BUY"}}
            order_by: {blockTimestamp: desc}
            limit: 1
        ) {
            id
            blockTimestamp
        }
    }
  `;
    },
  },
  blockExplorer: {
    erc20Transactions: (token, recipient, startBlock, endBlock) => {
      return {
        module: 'account',
        action: 'tokentx',
        contractaddress: token,
        address: recipient,
        startblock: startBlock,
        endblock: endBlock,
        offset: '2000',
        sort: 'asc',
        apikey: 'YourApiKeyToken',
      };
    },
    erc721Mints: (token, endBlock) => {
      return {
        module: 'account',
        action: 'tokennfttx',
        contractaddress: token,
        startblock: 0,
        address: '0x0000000000000000000000000000000000000000',
        endblock: endBlock,
        offset: '2000',
        sort: 'asc',
        apikey: 'YourApiKeyToken',
      };
    },
  },
  rpc: {
    currentBlockNumber: () => {
      return JSON.stringify({
        method: 'eth_blockNumber',
        params: [],
        id: 1,
        jsonrpc: '2.0',
      });
    },
  },
};
