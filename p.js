import axios from 'axios';

const AXELAR_API = 'https://api.axelarscan.io/gmp/searchGMP';
const SQUID_API = 'https://apiplus.squidrouter.com/v2/rfq/order';

async function lookupTransaction(txHash) {
  if (!txHash.startsWith('0x')) {
    throw new Error('Transaction hash must start with 0x');
  }

  const axelarBody = { size: 1, txHash };
  try {
    // Axelar API call
    const axelarResponse = await axios.post(AXELAR_API, axelarBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (
      axelarResponse.data.data &&
      axelarResponse.data.data.length > 0
    ) {
      const from = axelarResponse.data.data[0].call.receipt.from;
      console.log(`Transaction found in Axelar: ${from}`);
      return from;
    }
  } catch (error) {
    console.log(error);
    console.log(`Not found in Axelar: ${txHash}`);
  }

  try {
    // Squid API call
    const squidResponse = await axios.post(
      SQUID_API,
      { hash: txHash },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-integrator-id': CONFIG.integratorId,
        },
      }
    );

    if (squidResponse.data) {
      const from = squidResponse.data.fromAddress;
      console.log(`Transaction found in Squid: ${from}`);
      return from;
    }
  } catch (error) {
    console.log(`Not found in Squid: ${txHash}`);
  }

  // Fallback to on-chain receipt
  try {
    return getTxReceipt(txHash);
  } catch (error) {
    console.log('Error in getting from tx Receipt', txHash);
  }
  return null;
}

lookupTransaction(
  '0x98a14863131f13974d95b4cbe16d01a8a044ab53054d66065847525c021def74'
).then((res) => console.log(res));
