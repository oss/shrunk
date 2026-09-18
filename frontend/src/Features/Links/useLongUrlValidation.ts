import { useQuery } from '@tanstack/react-query';
import useDebounce from '@/Shared/Hooks/useDebounce';
import { serverValidateLongUrl } from '@/Shared/Lib/ServerValidators';

type Status = 'idle' | 'validating' | 'valid' | 'invalid';

export function useLongUrlValidation(
  value: string,
  enabled: boolean,
  originalValue = '',
): { status: Status; message: string } {
  const trimmedValue = value.trim();
  const debouncedValue = useDebounce(trimmedValue, 400);
  let hasValidSyntax = false;

  try {
    hasValidSyntax = ['http:', 'https:'].includes(
      new URL(debouncedValue).protocol,
    );
  } catch {
    // Invalid URLs are handled locally without a request.
  }

  const isOriginal = debouncedValue === originalValue.trim();
  const query = useQuery({
    queryKey: ['link', 'validate-long-url', debouncedValue],
    queryFn: async ({ signal }) => {
      await serverValidateLongUrl(debouncedValue, signal);
      return true;
    },
    enabled: enabled && !!debouncedValue && hasValidSyntax && !isOriginal,
    retry: false,
  });

  if (!enabled || !trimmedValue) return { status: 'idle', message: '' };
  if (trimmedValue !== debouncedValue)
    return { status: 'validating', message: '' };
  if (!hasValidSyntax)
    return { status: 'invalid', message: 'Enter a valid URL' };
  if (isOriginal || query.isSuccess) return { status: 'valid', message: '' };
  if (query.isError) {
    return {
      status: 'invalid',
      message:
        query.error instanceof Error && query.error.message
          ? query.error.message
          : 'Invalid URL',
    };
  }
  return { status: 'validating', message: '' };
}
