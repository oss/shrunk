import { useCallback } from 'react';
import { useParams } from 'react-router';

import { generateAccessToken, getAccessTokens } from '@/Api/Organization';
import AccessTokenManager from '@/Components/AccessTokenManager';
import { AccessTokenData } from '@/Interfaces/AccessToken';

export default function OrganizationTokens() {
  const { id = '' } = useParams<{ id: string }>();
  const loadTokens = useCallback(
    () => getAccessTokens(id) as Promise<AccessTokenData[]>,
    [id],
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
    }) => generateAccessToken(title, description, permissions, id),
    [id],
  );

  return (
    <AccessTokenManager
      heading="Access Tokens"
      tokenLabel="Access Token"
      loadTokens={loadTokens}
      generateToken={generateToken}
    />
  );
}
