import { defineData, a, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Item: a
    .model({
      name: a.string().required(),
      category: a.string().required(),
      store: a.enum(['sams', 'ht', 'both']),
      parStock: a.float().required(),
      unit: a.string().required(),
      cadenceDays: a.integer().required(),
      approxCost: a.float().required(),
      notes: a.string(),
      isCustom: a.boolean().default(false),
    })
    .authorization(allow => [allow.owner()]),

  ShoppingList: a
    .model({
      name: a.string().required(),
      weekOf: a.date().required(),
      store: a.enum(['sams', 'ht', 'both']),
      status: a.enum(['draft', 'active', 'complete']),
      totalSpend: a.float(),
      items: a.hasMany('ShoppingListItem', 'listId'),
    })
    .authorization(allow => [
      allow.owner(),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
    ]),

  ShoppingListItem: a
    .model({
      listId: a.id().required(),
      list: a.belongsTo('ShoppingList', 'listId'),
      itemId: a.string().required(),
      name: a.string().required(),
      category: a.string().required(),
      store: a.enum(['sams', 'ht', 'both']),
      quantity: a.float().required(),
      unit: a.string().required(),
      approxCost: a.float().required(),
      checked: a.boolean().default(false),
      notes: a.string(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
    ]),

  WeeklyLog: a
    .model({
      listId: a.string().required(),
      weekOf: a.date().required(),
      store: a.enum(['sams', 'ht', 'both']),
      totalSpend: a.float().required(),
      itemCount: a.integer().required(),
      completedAt: a.datetime().required(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.publicApiKey().to(['create', 'read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
});
