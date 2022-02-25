/**
 * Implements some functions used to perform field validation in certain cases where
 * the validation cannot be implemented client-side
 * @packageDocumentation
 */

import base32 from 'hi-base32';

/**
 * Check whether an alias is allowed
 * @function
 * @param _rule The rule
 * @param value The alias
 * @throws Error if the alias is a reserved word
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const serverValidateReservedAlias = async (
  _rule: any,
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await fetch(
    `/api/v1/link/validate_reserved_alias/${base32.encode(value)}`,
  ).then((resp) => resp.json());
  if (!result.valid && value.length >= 5) {
    throw new Error(result.reason);
  }
};

/**
 * Check whether an alias is allowed
 * @function
 * @param _rule The rule
 * @param value The alias
 * @throws Error if the alias already exists
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const serverValidateDuplicateAlias = async (
  _rule: any,
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await fetch(
    `/api/v1/link/validate_duplicate_alias/${base32.encode(value)}`,
  ).then((resp) => resp.json());
  if (!result.valid && value.length >= 5) {
    throw new Error(result.reason);
  }
};

/**
 * Check whether a long URL is allowed
 * @function
 * @param _rule The rule
 * @param value The long URL
 * @throws Error if the long URL is not allowed
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const serverValidateLongUrl = async (
  _rule: any,
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await fetch(
    `/api/v1/link/validate_long_url/${base32.encode(value)}`,
  ).then((resp) => resp.json());
  if (!result.valid) {
    throw new Error(result.reason);
  }
};

/**
 * Check whether a NetID is valid
 * @function
 * @param _rule The rule
 * @param value The NetID
 * @throws [[Error]] if the NetID is invalid
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const serverValidateNetId = async (
  _rule: any,
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await fetch('/api/v1/org/validate_netid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ netid: value }),
  }).then((resp) => resp.json());
  if (!result.valid) {
    throw new Error(result.reason);
  }
};



//checks if an organization name is used
export const serverValidateOrgName = async (
  _rule: any,
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await fetch('/api/v1/org/validate_name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: value }),
  }).then((resp) => resp.json());
  if (!result.valid) {
    throw new Error(result.reason);
  }
};
