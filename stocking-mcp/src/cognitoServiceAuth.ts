/**
 * Cognito service account token provider for the MCP Lambda.
 *
 * Authenticates a dedicated Cognito user (e.g. claude-mcp@household) using
 * USER_PASSWORD_AUTH and caches the access token until it nears expiry.
 * Module-level caching means warm Lambda invocations reuse the token without
 * a round-trip to Cognito.
 *
 * Required environment variables (set in Lambda console / SSM):
 *   MCP_SERVICE_EMAIL    — Cognito username / email of the service account
 *   MCP_SERVICE_PASSWORD — Password for that account
 *   COGNITO_CLIENT_ID    — App client ID (from amplify_outputs.json: user_pool_client_id)
 *   COGNITO_REGION       — AWS region (default: us-east-1)
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

interface TokenCache {
  accessToken: string;
  /** Unix timestamp (ms) when the token expires. */
  expiresAt: number;
}

// Reused across warm Lambda invocations.
let cache: TokenCache | null = null;

export class CognitoServiceAuth {
  private client: CognitoIdentityProviderClient;

  constructor(
    private readonly clientId: string,
    private readonly email: string,
    private readonly password: string,
    region = 'us-east-1'
  ) {
    this.client = new CognitoIdentityProviderClient({ region });
  }

  /**
   * Returns a valid Cognito access token, re-authenticating only when the
   * cached token is absent or within 60 seconds of expiry.
   */
  async getToken(): Promise<string> {
    if (cache && Date.now() < cache.expiresAt - 60_000) {
      return cache.accessToken;
    }

    const resp = await this.client.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: this.email,
          PASSWORD: this.password,
        },
      })
    );

    const result = resp.AuthenticationResult;
    if (!result?.AccessToken || !result.ExpiresIn) {
      throw new Error('Cognito service auth failed: no token in response');
    }

    cache = {
      accessToken: result.AccessToken,
      expiresAt: Date.now() + result.ExpiresIn * 1000,
    };

    return cache.accessToken;
  }
}

/**
 * Builds a CognitoServiceAuth instance from environment variables, or returns
 * null if the required variables are not set (API key fallback will be used).
 */
export function cognitoServiceAuthFromEnv(): CognitoServiceAuth | null {
  const email    = process.env['MCP_SERVICE_EMAIL'];
  const password = process.env['MCP_SERVICE_PASSWORD'];
  const clientId = process.env['COGNITO_CLIENT_ID'];
  const region   = process.env['COGNITO_REGION'] ?? 'us-east-1';

  if (!email || !password || !clientId) return null;

  return new CognitoServiceAuth(clientId, email, password, region);
}
