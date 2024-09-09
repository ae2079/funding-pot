import { createWalletClient, getContract } from 'viem';

export const keysToLowerCase = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ])
  );

export const serializeBigInt = (obj) => {
  return JSON.stringify(
    obj,
    (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    4
  );
};
