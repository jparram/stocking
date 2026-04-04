/**
 * Cognito admin operations for family member management.
 *
 * Environment variables required:
 *   COGNITO_USER_POOL_ID  — Cognito User Pool ID (from amplify_outputs.json)
 *   COGNITO_REGION        — AWS region (default: us-east-1)
 *   ADMIN_USER_SUB        — (optional) hardcoded admin user sub; if set, only
 *                           this user may call admin endpoints
 */

import {
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  GetUserCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const region = process.env['COGNITO_REGION'] ?? 'us-east-1';

const cognitoClient = new CognitoIdentityProviderClient({ region });

const USER_POOL_ID = process.env['COGNITO_USER_POOL_ID'] ?? '';
const ADMIN_USER_SUB = process.env['ADMIN_USER_SUB'] ?? '';

export interface FamilyMember {
  sub: string;
  email: string;
  username: string;
  status: string;
  enabled: boolean;
  createdAt?: string;
}

/**
 * Validates a Cognito access token by calling GetUser and confirms the caller
 * is in the 'admin' group (or matches the hardcoded ADMIN_USER_SUB).
 * Returns the caller's Cognito username on success.
 */
async function verifyAdmin(accessToken: string): Promise<string> {
  if (!USER_POOL_ID) {
    throw new Error('COGNITO_USER_POOL_ID is not configured on this Lambda.');
  }

  // We call GetUser with the raw access token rather than decoding the JWT
  // ourselves. This delegates signature verification and expiry checking to
  // Cognito — if the token is invalid or expired, Cognito returns an error and
  // we never proceed. Trusting a locally-decoded claim without this server-side
  // check would allow a tampered or expired token to pass.
  const userResp = await cognitoClient.send(
    new GetUserCommand({ AccessToken: accessToken })
  );

  const sub =
    userResp.UserAttributes?.find((a) => a.Name === 'sub')?.Value ?? '';

  const username = userResp.Username ?? '';

  // Hardcoded sub takes priority when set
  if (ADMIN_USER_SUB) {
    if (sub !== ADMIN_USER_SUB) {
      throw new Error('Forbidden: not the designated admin user.');
    }
    return username;
  }

  // Otherwise verify membership in the 'admin' Cognito group
  const groupsResp = await cognitoClient.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    })
  );

  const groups = (groupsResp.Groups ?? []).map((g) => g.GroupName ?? '');
  if (!groups.includes('admin')) {
    throw new Error('Forbidden: user is not in the admin group.');
  }

  return username;
}

/** List all users currently in the 'family' Cognito group. */
export async function listFamilyMembers(
  accessToken: string
): Promise<FamilyMember[]> {
  await verifyAdmin(accessToken);

  const users: FamilyMember[] = [];
  let nextToken: string | undefined;

  // ListUsersInGroup returns at most 60 users per page; loop until exhausted.
  do {
    const resp = await cognitoClient.send(
      new ListUsersInGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: 'family',
        NextToken: nextToken,
      })
    );

    for (const u of resp.Users ?? []) {
      users.push({
        sub: u.Attributes?.find((a) => a.Name === 'sub')?.Value ?? '',
        email: u.Attributes?.find((a) => a.Name === 'email')?.Value ?? '',
        username: u.Username ?? '',
        status: u.UserStatus ?? 'UNKNOWN',
        enabled: u.Enabled ?? true,
        createdAt: u.UserCreateDate?.toISOString(),
      });
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return users;
}

/** Create a new Cognito user and add them to the 'family' group. */
export async function inviteFamilyMember(
  accessToken: string,
  email: string
): Promise<FamilyMember> {
  await verifyAdmin(accessToken);

  const createResp = await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    })
  );

  const newUser = createResp.User;
  if (!newUser?.Username) {
    throw new Error('Cognito did not return a username for the new user.');
  }

  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: newUser.Username,
      GroupName: 'family',
    })
  );

  return {
    sub: newUser.Attributes?.find((a) => a.Name === 'sub')?.Value ?? '',
    email,
    username: newUser.Username,
    status: newUser.UserStatus ?? 'FORCE_CHANGE_PASSWORD',
    enabled: newUser.Enabled ?? true,
    createdAt: newUser.UserCreateDate?.toISOString(),
  };
}

/** Remove a user from the 'family' group (does not delete their account). */
export async function removeFamilyMember(
  accessToken: string,
  username: string
): Promise<{ removed: string }> {
  await verifyAdmin(accessToken);

  await cognitoClient.send(
    new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: 'family',
    })
  );

  return { removed: username };
}
