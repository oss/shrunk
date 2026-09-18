/**
 * Implements some functions used to perform field validation in certain cases where
 * the validation cannot be implemented client-side
 * @packageDocumentation
 */

import base32 from 'hi-base32';
import { api } from '@/Shared/Lib/Http';

interface ValidationResult {
  valid: boolean;
  reason: string;
}

/**
 * Check whether an alias is allowed
 * @function
 * @param value The alias
 * @throws Error if the alias already exists
 */

export const serverValidateDuplicateAlias = async (
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await api<ValidationResult>(
    `link/validate_duplicate_alias/${base32.encode(value)}`,
  );
  if (!result.valid && value.length >= 5) {
    throw new Error(result.reason);
  }
};

export const serverValidateReservedAlias = async (
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await api<ValidationResult>(
    `link/validate_reserved_alias/${base32.encode(value)}`,
  );
  if (!result.valid) {
    throw new Error(result.reason);
  }
};

/**
 * Check whether a long URL is allowed
 * @function
 * @param value The long URL
 * @throws Error if the long URL is not allowed
 */

export const serverValidateLongUrl = async (
  value: string,
  signal?: AbortSignal,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await api<ValidationResult>(
    `link/validate_long_url/${base32.encode(value)}`,
    { signal },
  );
  if (!result.valid) {
    throw new Error(result.reason);
  }
};

/**
 * Check whether a NetID is valid
 * @function
 * @param value The NetID
 * @throws [[Error]] if the NetID is invalid
 */

export const serverValidateNetId = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await api<ValidationResult>('org/validate_netid', {
    method: 'POST',
    body: { netid: value },
  });
  if (!result.valid) {
    throw new Error(result.reason);
  }
};

/**
 * Check whether a NetID is a university guest
 * @function
 * @param value The NetID
 * @returns [[Error]] if the user is not a university guest
 */

export const serverValidateGuest = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await api<ValidationResult>('org/validate_guest', {
    method: 'POST',
    body: { netid: value },
  });
  if (!result.valid) {
    throw new Error(result.reason);
  }
};

// checks if an organization name is used
export const serverValidateOrgName = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await api<ValidationResult>('org/validate_name', {
    method: 'POST',
    body: { name: value },
  });
  if (!result.valid) {
    throw new Error(result.reason);
  }
};
