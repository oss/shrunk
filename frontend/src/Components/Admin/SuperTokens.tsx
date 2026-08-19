import { useCallback } from 'react';

import { generateAccessToken, getSuperTokens } from '@/Api/Organization';
import AccessTokenManager from '@/Components/AccessTokenManager';
import { AccessTokenData } from '@/Interfaces/AccessToken';

export default function SuperTokens() {
  const loadTokens = useCallback(
    () => getSuperTokens() as Promise<AccessTokenData[]>,
    [],
  );
  const generateToken = useCallback(
    ({
      title,
      description,
      permissions,
    }: {
      title: string;
      description: string;
      permissions: string[];
    }) => generateAccessToken(title, description, permissions),
    [],
  );

  return (
    <AccessTokenManager
      heading="Super Access Tokens"
      tokenLabel="Super Access Token"
      loadTokens={loadTokens}
      generateToken={generateToken}
    />
  );
}
