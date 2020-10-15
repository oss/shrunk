import base32 from 'hi-base32';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const serverValidateAlias = async (_rule: any, value: string): Promise<void> => {
    if (!value) {
        return;
    }
    const result = await fetch(`/api/v1/link/validate_alias/${base32.encode(value)}`)
        .then(resp => resp.json());
    if (!result.valid) {
        throw new Error(result.reason);
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const serverValidateLongUrl = async (_rule: any, value: string): Promise<void> => {
    if (!value) {
        return;
    }
    const result = await fetch(`/api/v1/link/validate_long_url/${base32.encode(value)}`)
        .then(resp => resp.json());
    if (!result.valid) {
        throw new Error(result.reason);
    }
}
