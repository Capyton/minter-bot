import { Address } from 'ton-core';

export function isAddress(address: string) {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}
