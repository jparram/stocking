import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { Stack } from 'aws-cdk-lib';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * AWS Amplify Gen 2 Backend Definition
 * Family Grocery Tracker App
 *
 * Resources:
 * - Auth: Cognito User Pool (email/password), groups: ['family']
 * - Data: DynamoDB via AppSync GraphQL (Item, ShoppingList, ShoppingListItem, WeeklyLog)
 * - Storage: S3 (for shared list PDFs)
 */
const backend = defineBackend({
  auth,
  data,
  storage,
});

// ---------------------------------------------------------------------------
// Seed a default admin user so the app is immediately usable after first deploy.
// Override via environment variables before running `npx ampx sandbox` or CI/CD:
//   SEED_USER_EMAIL    – defaults to admin@example.com
//   SEED_USER_PASSWORD – defaults to Stocking123! (change after first login)
// ---------------------------------------------------------------------------
const seedEmail = process.env.SEED_USER_EMAIL ?? 'admin@example.com';
const seedPassword = process.env.SEED_USER_PASSWORD ?? 'Stocking123!';
const { userPool } = backend.auth.resources;
const authStack = Stack.of(userPool);

const createUser = new AwsCustomResource(authStack, 'SeedAdminUser', {
  onCreate: {
    service: 'CognitoIdentityServiceProvider',
    action: 'adminCreateUser',
    parameters: {
      UserPoolId: userPool.userPoolId,
      Username: seedEmail,
      TemporaryPassword: seedPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: seedEmail },
        { Name: 'email_verified', Value: 'true' },
      ],
    },
    physicalResourceId: PhysicalResourceId.of('seed-admin-user'),
    ignoreErrorCodesMatching: 'UsernameExistsException',
  },
  policy: AwsCustomResourcePolicy.fromStatements([
    new PolicyStatement({
      actions: ['cognito-idp:AdminCreateUser'],
      resources: [userPool.userPoolArn],
    }),
  ]),
});

const setPassword = new AwsCustomResource(authStack, 'SeedAdminUserPassword', {
  onCreate: {
    service: 'CognitoIdentityServiceProvider',
    action: 'adminSetUserPassword',
    parameters: {
      UserPoolId: userPool.userPoolId,
      Username: seedEmail,
      Password: seedPassword,
      Permanent: true,
    },
    physicalResourceId: PhysicalResourceId.of('seed-admin-user-password'),
    ignoreErrorCodesMatching: 'UserNotFoundException',
  },
  policy: AwsCustomResourcePolicy.fromStatements([
    new PolicyStatement({
      actions: ['cognito-idp:AdminSetUserPassword'],
      resources: [userPool.userPoolArn],
    }),
  ]),
});
setPassword.node.addDependency(createUser);

const addToGroup = new AwsCustomResource(authStack, 'SeedAdminUserGroup', {
  onCreate: {
    service: 'CognitoIdentityServiceProvider',
    action: 'adminAddUserToGroup',
    parameters: {
      UserPoolId: userPool.userPoolId,
      Username: seedEmail,
      GroupName: 'family',
    },
    physicalResourceId: PhysicalResourceId.of('seed-admin-user-group'),
    ignoreErrorCodesMatching: 'UserNotFoundException',
  },
  policy: AwsCustomResourcePolicy.fromStatements([
    new PolicyStatement({
      actions: ['cognito-idp:AdminAddUserToGroup'],
      resources: [userPool.userPoolArn],
    }),
  ]),
});
addToGroup.node.addDependency(createUser);
