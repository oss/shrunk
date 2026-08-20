/**
 * Implements some functions used to perform field validation in cases where
 * the validation cannot be implemented client-side.
 * @packageDocumentation
 */

import base32 from 'hi-base32';
import { ApiError, requestJson } from '@/Api/Client';

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

function validationMessage(result: ValidationResult, fallback: string): string {
  return result.reason || fallback;
}

function validationError(message: string): ApiError {
  return new ApiError({ code: 'VALIDATION_ERROR', message });
}

/** Check whether an alias is allowed. */
export const serverValidateDuplicateAlias = async (
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await requestJson<ValidationResult>(
    `/api/core/link/validate_duplicate_alias/${base32.encode(value)}`,
  );
  if (!result.valid && value.length >= 5) {
    throw validationError(
      validationMessage(result, 'That alias already exists.'),
    );
  }
};

export const serverValidateReservedAlias = async (
  value: string,
): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await requestJson<ValidationResult>(
    `/api/core/link/validate_reserved_alias/${base32.encode(value)}`,
  );
  if (!result.valid) {
    throw validationError(
      validationMessage(result, 'That alias cannot be used.'),
    );
  }
};

/** Check whether a long URL is allowed. */
export const serverValidateLongUrl = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await requestJson<ValidationResult>(
    `/api/core/link/validate_long_url/${base32.encode(value)}`,
  );
  if (!result.valid) {
    throw validationError(
      validationMessage(result, 'That destination URL is not allowed.'),
    );
  }
};

/** Check whether a NetID is valid. */
export const serverValidateNetId = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await requestJson<ValidationResult>(
    '/api/core/org/validate_netid',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ netid: value }),
    },
  );
  if (!result.valid) {
    throw validationError(
      validationMessage(result, 'That NetID is not valid.'),
    );
  }
};

/** Check whether a NetID belongs to a university guest. */
export const serverValidateGuest = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await requestJson<ValidationResult>(
    '/api/core/org/validate_guest',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ netid: value }),
    },
  );
  if (!result.valid) {
    throw validationError(
      validationMessage(result, 'That NetID does not have the guest role.'),
    );
  }
};

/** Check whether an organization name is available. */
export const serverValidateOrgName = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  const result = await requestJson<ValidationResult>(
    '/api/core/org/validate_name',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name: value }),
    },
  );
  if (!result.valid) {
    throw validationError(
      validationMessage(result, 'That name is already taken.'),
    );
  }
};
