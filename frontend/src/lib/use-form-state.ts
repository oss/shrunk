import { useCallback, useState } from 'react';
import type { z } from 'zod';

type FieldErrors = Record<string, string>;

export function useFormState<T extends z.ZodTypeAny>(schema: T) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback(
    async (data: unknown): Promise<boolean> => {
      setSubmitting(true);
      const result = await schema.safeParseAsync(data);
      setSubmitting(false);

      if (!result.success) {
        const flattened = result.error.flatten();
        const fieldErrors: FieldErrors = {};

        for (const [key, messages] of Object.entries(
          flattened.fieldErrors as Record<string, string[] | undefined>,
        )) {
          if (messages && messages.length > 0) {
            fieldErrors[key] = messages[0];
          }
        }

        if (flattened.formErrors.length > 0) {
          fieldErrors._form = flattened.formErrors[0];
        }

        setErrors(fieldErrors);
        return false;
      }

      setErrors({});
      return true;
    },
    [schema],
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, submitting, validate, setErrors, clearErrors };
}
