import { useCallback } from 'react';
import { useParams } from 'react-router';

import {
  generateAccessToken,
  getAccessTokens,
} from '@/Features/AccessTokens/Api';
import AccessTokenManager from '@/Features/AccessTokens/AccessTokenManager';

export default function OrganizationTokens() {
  const { id = '' } = useParams<{ id: string }>();
  const loadTokens = useCallback(() => getAccessTokens(id), [id]);
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
      queryKey={['access-tokens', id]}
      loadTokens={loadTokens}
      generateToken={generateToken}
    />
  );
}
