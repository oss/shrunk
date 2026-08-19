/**
 * Implements some functions used to perform field validation in certain cases where
 * the validation cannot be implemented client-side
 * @packageDocumentation
 */

import base32 from 'hi-base32';

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
  const result: ValidationResult = await fetch(
    `/api/core/link/validate_duplicate_alias/${base32.encode(value)}`,
  ).then((resp) => resp.json());
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
  const result: ValidationResult = await fetch(
    `/api/core/link/validate_reserved_alias/${base32.encode(value)}`,
  ).then((resp) => resp.json());
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

export const serverValidateLongUrl = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result: ValidationResult = await fetch(
    `/api/core/link/validate_long_url/${base32.encode(value)}`,
  ).then((resp) => resp.json());
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
  const result: ValidationResult = await fetch('/api/core/org/validate_netid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ netid: value }),
  }).then((resp) => resp.json());
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
  const result: ValidationResult = await fetch('/api/core/org/validate_guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ netid: value }),
  }).then((resp) => resp.json());
  if (!result.valid) {
    throw new Error(result.reason);
  }
};

// checks if an organization name is used
export const serverValidateOrgName = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result: ValidationResult = await fetch('/api/core/org/validate_name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: value }),
  }).then((resp) => resp.json());
  if (!result.valid) {
    throw new Error(result.reason);
  }
};
