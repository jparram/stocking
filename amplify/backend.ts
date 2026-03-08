import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

/**
 * AWS Amplify Gen 2 Backend Definition
 * Family Grocery Tracker App
 *
 * Resources:
 * - Auth: Cognito User Pool (email/password)
 * - Data: DynamoDB via AppSync GraphQL (Item, ShoppingList, ShoppingListItem, WeeklyLog)
 * - Storage: S3 (for shared list PDFs)
 */
defineBackend({
  auth,
  data,
  storage,
});
