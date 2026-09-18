import { useCallback } from 'react';

import {
  generateAccessToken,
  getSuperTokens,
} from '@/Features/AccessTokens/Api';
import AccessTokenManager from '@/Features/AccessTokens/AccessTokenManager';

export default function SuperTokens() {
  const loadTokens = useCallback(() => getSuperTokens(), []);
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
      queryKey={['access-tokens', 'super']}
      loadTokens={loadTokens}
      generateToken={generateToken}
    />
  );
}
