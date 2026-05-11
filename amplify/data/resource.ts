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
    .authorization(allow => [
      allow.owner(),
      allow.group('family').to(['create', 'read', 'update', 'delete']),
    ]),

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
      allow.group('family').to(['create', 'read', 'update', 'delete']),
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
      allow.group('family').to(['create', 'read', 'update', 'delete']),
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
      allow.group('family').to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['create', 'read']),
    ]),

  Recipe: a
    .model({
      name: a.string().required(),
      description: a.string(),
      servings: a.integer(),
      prepMinutes: a.integer(),
      cookMinutes: a.integer(),
      tags: a.string().array(),
      sourceUrl: a.string(),
      notes: a.string(),
      isFavorite: a.boolean(),
      lastMadeDate: a.date(),
      ingredients: a.hasMany('RecipeIngredient', 'recipeId'),
    })
    .authorization(allow => [
      allow.owner(),
      allow.group('family').to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
    ]),

  RecipeIngredient: a
    .model({
      recipeId: a.id().required(),
      recipe: a.belongsTo('Recipe', 'recipeId'),
      name: a.string().required(),
      amount: a.float(),
      unit: a.string(),
      catalogItemId: a.string(), // optional ref to masterCatalog item ID (e.g. "ht-006")
      notes: a.string(),
      sortOrder: a.integer(), // display order within the recipe
    })
    .authorization(allow => [
      allow.owner(),
      allow.group('family').to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
    ]),

  Member: a
    .model({
      cognitoSub: a.string().required(), // Cognito user sub — links to the authenticated user
      displayName: a.string().required(), // Human-readable name shown in UI (e.g. "Dave", "Sarah")
      email: a.string().required(),       // Cognito email, stored for reference
      role: a.enum(['admin', 'member']),  // admin can invite/remove others
      color: a.string(),                  // Hex or token — used for calendar color coding per member
    })
    .authorization(allow => [
      allow.owner(),
      allow.group('family').to(['read']),
      allow.group('admin').to(['read', 'update']),
      allow.publicApiKey().to(['create', 'read']),
    ]),

  MealPlan: a
    .model({
      weekOf: a.date().required(),   // ISO date of Monday of the week
      type: a.enum(['family', 'individual']),
      memberId: a.string(),          // null for family plans; Member.id for individual
      entries: a.hasMany('MealEntry', 'planId'),
    })
    .authorization(allow => [
      allow.owner(),
      allow.group('family').to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
    ]),

  WorkoutDayType: a.enum(['STRENGTH', 'HIIT', 'REST']),

  WorkoutProgram: a
    .model({
      memberId: a.string().required(),
      name: a.string().required(),
      description: a.string(),
      split: a.string(),
      isActive: a.boolean().required(),
      days: a.hasMany('WorkoutDay', 'programId'),
      sessions: a.hasMany('WorkoutSession', 'programId'),
    })
    .authorization(allow => [
      allow.ownerDefinedIn('memberId'),
      allow.group('family').to(['read']),
      allow.publicApiKey().to(['create', 'read']),
    ]),

  WorkoutDay: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo('WorkoutProgram', 'programId'),
      memberId: a.string().required(),
      dayLabel: a.string().required(),
      type: a.ref('WorkoutDayType').required(),
      sortOrder: a.integer().required(),
      exercises: a.json(),
      sessions: a.hasMany('WorkoutSession', 'dayId'),
    })
    .secondaryIndexes(index => [index('programId').name('byProgram')])
    .authorization(allow => [
      allow.ownerDefinedIn('memberId'),
      allow.group('family').to(['read']),
      allow.publicApiKey().to(['create', 'read']),
    ]),

  WorkoutSession: a
    .model({
      memberId: a.string().required(),
      programId: a.id().required(),
      program: a.belongsTo('WorkoutProgram', 'programId'),
      dayId: a.id().required(),
      day: a.belongsTo('WorkoutDay', 'dayId'),
      completedAt: a.date().required(),
      durationMinutes: a.integer(),
      notes: a.string(),
    })
    .secondaryIndexes(index => [
      index('programId').name('byProgram'),
      index('dayId').name('byDay'),
    ])
    .authorization(allow => [
      allow.ownerDefinedIn('memberId'),
      allow.group('family').to(['read']),
      allow.publicApiKey().to(['create', 'read']),
    ]),

  MealEntry: a
    .model({
      planId: a.id().required(),
      plan: a.belongsTo('MealPlan', 'planId'),
      dayOfWeek: a.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']),
      mealType: a.enum(['breakfast', 'lunch', 'dinner']),
      recipeId: a.string(),          // optional link to a Recipe record
      label: a.string(),             // free-text fallback when no recipe
      notes: a.string(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.group('family').to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
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
