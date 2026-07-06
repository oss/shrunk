import { z } from 'zod';

import {
  serverValidateDuplicateAlias,
  serverValidateLongUrl,
  serverValidateOrgName,
  serverValidateReservedAlias,
} from '@/api/validators';

// ── Sync building blocks ──────────────────────────────────────────

export const orgNameSchema = z
  .string()
  .min(1, 'Please input a new name.')
  .max(60, 'Org names can be at most 60 characters long')
  .regex(
    /^[a-zA-Z0-9_.,-]*$/,
    'Name must consist of letters, numbers, and the characters "_.,-".',
  );

export const aliasSchema = z
  .string()
  .min(5, 'Alias must be at least 5 characters')
  .max(60, 'Alias can be at most 60 characters')
  .regex(
    /^[a-zA-Z0-9_.,-]*$/,
    'Alias must consist of letters, numbers, and the characters "_.,-".',
  );

export const longUrlSchema = z
  .string()
  .min(1, 'Long URL is required')
  .url('Must be a valid URL');

export const netIdSchema = z.string().min(1, 'NetID is required');

// ── Async wrappers (Zod refinements → server validators) ─────────

async function refineAliasNotReserved(val: string) {
  if (!val) return true;
  try {
    await serverValidateReservedAlias(null, val);
    return true;
  } catch {
    return false;
  }
}

async function refineAliasNotDuplicate(val: string) {
  if (!val) return true;
  try {
    await serverValidateDuplicateAlias(null, val);
    return true;
  } catch {
    return false;
  }
}

async function refineLongUrlAllowed(val: string) {
  if (!val) return true;
  try {
    await serverValidateLongUrl(null, val);
    return true;
  } catch {
    return false;
  }
}

export async function isValidOrgName(val: string) {
  if (!val) return true;
  try {
    await serverValidateOrgName(null, val);
    return true;
  } catch {
    return false;
  }
}

// ── Compound form schemas (with async refinements) ────────────────

export const renameOrgFormSchema = z
  .object({
    newName: orgNameSchema,
  })
  .refine(async (data) => isValidOrgName(data.newName), {
    message: 'Organization name is already taken',
    path: ['newName'],
  });

export const createLinkFormSchema = z
  .object({
    long_url: longUrlSchema,
    alias: aliasSchema.optional().or(z.literal('')),
    title: z.string().optional(),
    expiration_time: z.string().optional(),
  })
  .refine(async (data) => refineLongUrlAllowed(data.long_url), {
    message: 'This URL is not allowed',
    path: ['long_url'],
  })
  .refine(
    async (data) => {
      if (!data.alias) return true;
      return (
        (await refineAliasNotReserved(data.alias)) &&
        (await refineAliasNotDuplicate(data.alias))
      );
    },
    {
      message: 'This alias is not available',
      path: ['alias'],
    },
  );

export const editLinkFormSchema = z
  .object({
    alias: aliasSchema,
    long_url: longUrlSchema,
    owner: netIdSchema.optional(),
  })
  .refine(async (data) => refineLongUrlAllowed(data.long_url), {
    message: 'This URL is not allowed',
    path: ['long_url'],
  });

export const createTicketFormSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  entity: z
    .string()
    .max(10, 'Entity must be at most 10 characters')
    .regex(/^[a-zA-Z0-9]*$/, 'Entity must be alphanumeric')
    .optional()
    .or(z.literal('')),
  user_comment: z
    .string()
    .max(300, 'Comment must be at most 300 characters')
    .refine(
      (val) => !val || !val.includes('\n'),
      'Comment must not contain newlines',
    )
    .optional()
    .or(z.literal('')),
});
