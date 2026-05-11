/**
 * AppSync GraphQL client for the MCP server.
 * Uses API key auth — separate from the user's Cognito session.
 */

export interface ListInput {
  name: string;
  weekOf: string;
  store: string;
  status: string;
  totalSpend: number;
  items: ItemInput[];
}

export interface ItemInput {
  itemId: string;
  name: string;
  category: string;
  store: string;
  quantity: number;
  unit: string;
  approxCost: number;
  checked: boolean;
  notes: string;
}

export interface RecipeInput {
  name: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  tags?: string[];
  sourceUrl?: string;
  notes?: string;
  isFavorite?: boolean;
  lastMadeDate?: string;
}

export interface RecipeIngredientInput {
  name: string;
  amount?: number;
  unit?: string;
  catalogItemId?: string;
  notes?: string;
  sortOrder?: number;
}

export interface ReconcileItemUpdate {
  item_id: string;
  checked: boolean;
  notes?: string;
}

export interface MemberInput {
  cognitoSub: string;
  displayName: string;
  email: string;
  role?: 'admin' | 'member';
  color?: string;
}

export interface MealPlanInput {
  weekOf: string;
  type: 'family' | 'individual';
  memberId?: string | null;
}

export interface MealEntryInput {
  dayOfWeek: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipeId?: string | null;
  label?: string | null;
  notes?: string | null;
}

export interface WorkoutSessionInput {
  memberId: string;
  programId: string;
  dayId: string;
  completedAt: string;
  durationMinutes?: number;
  notes?: string;
}

// ── Meal entry sort helpers ───────────────────────────────────────────────────

const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner'];

function sortMealEntries(
  entries: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return [...entries].sort((a, b) => {
    const dayDiff =
      DAY_ORDER.indexOf(a['dayOfWeek'] as string) -
      DAY_ORDER.indexOf(b['dayOfWeek'] as string);
    if (dayDiff !== 0) return dayDiff;
    return (
      MEAL_ORDER.indexOf(a['mealType'] as string) -
      MEAL_ORDER.indexOf(b['mealType'] as string)
    );
  });
}

type AuthProvider =
  | { type: 'apikey'; apiKey: string }
  | { type: 'cognito'; getToken: () => Promise<string> };

export class GraphQLClient {
  private auth: AuthProvider;

  constructor(
    private endpoint: string,
    auth: AuthProvider
  ) {
    this.auth = auth;
  }

  private async query<T>(
    gqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const authHeader: Record<string, string> =
      this.auth.type === 'apikey'
        ? { 'x-api-key': this.auth.apiKey }
        : { Authorization: `Bearer ${await this.auth.getToken()}` };

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({ query: gqlQuery, variables }),
    });

    if (!res.ok)
      throw new Error(`AppSync HTTP ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as {
      data?: T;
      errors?: { message: string }[];
    };
    if (json.errors?.length)
      throw new Error(json.errors.map((e) => e.message).join(', '));
    if (!json.data)
      throw new Error('No data returned from AppSync');
    return json.data;
  }

  // ── CREATE LIST + ITEMS ───────────────────────────────────────────────────
  async createShoppingList(input: ListInput): Promise<{ id: string }> {
    const listData = await this.query<{
      createShoppingList: { id: string };
    }>(
      `mutation CreateShoppingList($input: CreateShoppingListInput!) {
        createShoppingList(input: $input) { id }
      }`,
      {
        input: {
          name:       input.name,
          weekOf:     input.weekOf,
          store:      input.store,
          status:     input.status,
          totalSpend: input.totalSpend,
        },
      }
    );

    const listId = listData.createShoppingList.id;
    for (const item of input.items) {
      await this.createShoppingListItem(listId, item);
    }
    return { id: listId };
  }

  // ── ADD SINGLE ITEM TO EXISTING LIST ─────────────────────────────────────
  async addItemToList(listId: string, item: ItemInput): Promise<{ id: string }> {
    return this.createShoppingListItem(listId, item);
  }

  // ── SHARED ITEM CREATION MUTATION ─────────────────────────────────────────
  private async createShoppingListItem(
    listId: string,
    item: ItemInput
  ): Promise<{ id: string }> {
    const data = await this.query<{ createShoppingListItem: { id: string } }>(
      `mutation CreateShoppingListItem($input: CreateShoppingListItemInput!) {
        createShoppingListItem(input: $input) { id }
      }`,
      {
        input: {
          listId,
          itemId:     item.itemId,
          name:       item.name,
          category:   item.category,
          store:      item.store,
          quantity:   item.quantity,
          unit:       item.unit,
          approxCost: item.approxCost,
          checked:    item.checked,
          notes:      item.notes,
        },
      }
    );
    return { id: data.createShoppingListItem.id };
  }

  // ── DELETE LIST ITEM ──────────────────────────────────────────────────────
  async deleteListItem(itemId: string): Promise<{ id: string }> {
    const data = await this.query<{ deleteShoppingListItem: { id: string } }>(
      `mutation DeleteShoppingListItem($input: DeleteShoppingListItemInput!) {
        deleteShoppingListItem(input: $input) { id }
      }`,
      { input: { id: itemId } }
    );
    return { id: data.deleteShoppingListItem.id };
  }

  // ── LIST SHOPPING LISTS ───────────────────────────────────────────────────
  async listShoppingLists(
    limit = 5,
    store?: string,
    status?: string
  ): Promise<unknown[]> {
    // Fetch a large page from DynamoDB so client-side filters and slicing
    // operate on a representative set, not just the first N records scanned.
    const scanLimit = Math.max(limit * 20, 100);
    const data = await this.query<{
      listShoppingLists: { items: unknown[] };
    }>(
      `query ListShoppingLists($limit: Int) {
        listShoppingLists(limit: $limit) {
          items {
            id name weekOf store status totalSpend createdAt updatedAt
            items { items { id name checked } }
          }
        }
      }`,
      { limit: scanLimit }
    );

    let lists = data.listShoppingLists.items as Array<Record<string, unknown>>;
    // Sort newest first before filtering so slice returns the most recent.
    lists.sort((a, b) =>
      String(b['createdAt'] ?? '').localeCompare(String(a['createdAt'] ?? ''))
    );
    if (store)  lists = lists.filter((l) => l.store === store);
    if (status) lists = lists.filter((l) => l.status === status);
    return lists.slice(0, limit);
  }

  // ── LIST ALL COMPLETED LISTS (for spend summary) ──────────────────────────
  async listAllCompletedLists(): Promise<Array<{
    id: string; name: string; store: string; totalSpend: number;
    weekOf: string; createdAt: string; status: string;
  }>> {
    const data = await this.query<{
      listShoppingLists: { items: unknown[] };
    }>(
      `query ListAllShoppingLists {
        listShoppingLists(limit: 200) {
          items {
            id name weekOf store status totalSpend createdAt
          }
        }
      }`
    );
    return (data.listShoppingLists.items as Array<Record<string, unknown>>)
      .filter((l) => l['status'] === 'complete') as Array<{
        id: string; name: string; store: string; totalSpend: number;
        weekOf: string; createdAt: string; status: string;
      }>;
  }

  // ── GET LIST ITEMS ────────────────────────────────────────────────────────
  async getListItems(listId: string): Promise<unknown> {
    const data = await this.query<{
      getShoppingList: {
        id: string; name: string; store: string;
        status: string; totalSpend: number;
        items: { items: Array<Record<string, unknown>> };
      };
    }>(
      `query GetShoppingList($id: ID!) {
        getShoppingList(id: $id) {
          id name store weekOf status totalSpend
          items {
            items {
              id name category store quantity unit approxCost checked notes
            }
          }
        }
      }`,
      { id: listId }
    );

    const list = data.getShoppingList;
    const rawItems = list.items.items;

    const grouped: Record<string, unknown[]> = {};
    for (const item of rawItems) {
      const cat = item['category'] as string;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    return {
      id:                list.id,
      name:              list.name,
      store:             list.store,
      status:            list.status,
      estimated_total:   list.totalSpend,
      items_by_category: grouped,
    };
  }

  // ── UPDATE LIST ITEM ──────────────────────────────────────────────────────
  async updateListItem(
    _listId: string,
    itemId: string,
    checked: boolean,
    notes?: string
  ): Promise<unknown> {
    const input: Record<string, unknown> = { id: itemId, checked };
    if (notes !== undefined) input['notes'] = notes;

    const data = await this.query<{ updateShoppingListItem: unknown }>(
      `mutation UpdateShoppingListItem($input: UpdateShoppingListItemInput!) {
        updateShoppingListItem(input: $input) { id name checked notes }
      }`,
      { input }
    );
    return data.updateShoppingListItem;
  }

  // ── COMPLETE LIST ─────────────────────────────────────────────────────────
  async completeList(listId: string, actualSpend?: number): Promise<unknown> {
    const input: Record<string, unknown> = { id: listId, status: 'complete' };
    if (actualSpend !== undefined) input['totalSpend'] = actualSpend;

    const data = await this.query<{ updateShoppingList: unknown }>(
      `mutation UpdateShoppingList($input: UpdateShoppingListInput!) {
        updateShoppingList(input: $input) { id status totalSpend updatedAt }
      }`,
      { input }
    );
    return data.updateShoppingList;
  }

  // ── ADD ITEM TO EXISTING LIST ─────────────────────────────────────────────
  async addShoppingListItem(
    listId: string,
    item: ItemInput
  ): Promise<{ id: string }> {
    const data = await this.query<{ createShoppingListItem: { id: string } }>(
      `mutation CreateShoppingListItem($input: CreateShoppingListItemInput!) {
        createShoppingListItem(input: $input) { id }
      }`,
      {
        input: {
          listId,
          itemId:     item.itemId,
          name:       item.name,
          category:   item.category,
          store:      item.store,
          quantity:   item.quantity,
          unit:       item.unit,
          approxCost: item.approxCost,
          checked:    item.checked,
          notes:      item.notes,
        },
      }
    );
    return data.createShoppingListItem;
  }

  // ── CREATE RECIPE ─────────────────────────────────────────────────────────
  async createRecipe(
    input: RecipeInput,
    ingredients: RecipeIngredientInput[]
  ): Promise<{ id: string }> {
    const recipeInput: Record<string, unknown> = { name: input.name };
    if (input.description  !== undefined) recipeInput['description']  = input.description;
    if (input.servings     !== undefined) recipeInput['servings']     = input.servings;
    if (input.prepMinutes  !== undefined) recipeInput['prepMinutes']  = input.prepMinutes;
    if (input.cookMinutes  !== undefined) recipeInput['cookMinutes']  = input.cookMinutes;
    if (input.tags         !== undefined) recipeInput['tags']         = input.tags;
    if (input.sourceUrl    !== undefined) recipeInput['sourceUrl']    = input.sourceUrl;
    if (input.notes        !== undefined) recipeInput['notes']        = input.notes;
    if (input.isFavorite   !== undefined) recipeInput['isFavorite']   = input.isFavorite;
    if (input.lastMadeDate !== undefined) recipeInput['lastMadeDate'] = input.lastMadeDate;

    const recipeData = await this.query<{ createRecipe: { id: string } }>(
      `mutation CreateRecipe($input: CreateRecipeInput!) {
        createRecipe(input: $input) { id }
      }`,
      { input: recipeInput }
    );

    const recipeId = recipeData.createRecipe.id;

    for (let index = 0; index < ingredients.length; index++) {
      await this.createRecipeIngredient(recipeId, { ...ingredients[index], sortOrder: ingredients[index].sortOrder ?? index });
    }

    return { id: recipeId };
  }

  // ── GET RECIPE ────────────────────────────────────────────────────────────
  async getRecipe(id: string): Promise<unknown> {
    const data = await this.query<{
      getRecipe: Record<string, unknown> & {
        ingredients: { items: Array<Record<string, unknown>> };
      };
    }>(
      `query GetRecipe($id: ID!) {
        getRecipe(id: $id) {
          id name description servings prepMinutes cookMinutes
          tags sourceUrl notes isFavorite lastMadeDate createdAt updatedAt
          ingredients {
            items {
              id recipeId name amount unit catalogItemId notes sortOrder createdAt updatedAt
            }
          }
        }
      }`,
      { id }
    );

    const recipe = data.getRecipe;
    return {
      ...recipe,
      ingredients: recipe.ingredients.items,
    };
  }

  // ── LIST RECIPES ──────────────────────────────────────────────────────────
  async listRecipes(
    limit = 20,
    tag?: string,
    favoritesOnly?: boolean
  ): Promise<unknown[]> {
    const data = await this.query<{
      listRecipes: {
        items: Array<
          Record<string, unknown> & {
            ingredients: { items: Array<Record<string, unknown>> };
          }
        >;
      };
    }>(
      `query ListRecipes($limit: Int) {
        listRecipes(limit: $limit) {
          items {
            id name description tags servings prepMinutes cookMinutes
            isFavorite lastMadeDate
            ingredients { items { id } }
          }
        }
      }`,
      { limit }
    );

    let recipes = data.listRecipes.items;
    if (favoritesOnly) recipes = recipes.filter((r) => r['isFavorite'] === true);
    if (tag) recipes = recipes.filter((r) => {
      const tags = r['tags'] as string[] | null;
      return tags && tags.includes(tag);
    });

    return recipes.slice(0, limit).map((r) => ({
      id:              r['id'],
      name:            r['name'],
      description:     r['description'],
      tags:            r['tags'],
      servings:        r['servings'],
      prepMinutes:     r['prepMinutes'],
      cookMinutes:     r['cookMinutes'],
      isFavorite:      r['isFavorite'],
      lastMadeDate:    r['lastMadeDate'],
      ingredientCount: (r['ingredients'] as { items: unknown[] }).items.length,
    }));
  }

  // ── UPDATE RECIPE ─────────────────────────────────────────────────────────
  async updateRecipe(
    id: string,
    updates: Partial<RecipeInput>
  ): Promise<unknown> {
    const input: Record<string, unknown> = { id };
    if (updates.name         !== undefined) input['name']         = updates.name;
    if (updates.description  !== undefined) input['description']  = updates.description;
    if (updates.servings     !== undefined) input['servings']     = updates.servings;
    if (updates.prepMinutes  !== undefined) input['prepMinutes']  = updates.prepMinutes;
    if (updates.cookMinutes  !== undefined) input['cookMinutes']  = updates.cookMinutes;
    if (updates.tags         !== undefined) input['tags']         = updates.tags;
    if (updates.sourceUrl    !== undefined) input['sourceUrl']    = updates.sourceUrl;
    if (updates.notes        !== undefined) input['notes']        = updates.notes;
    if (updates.isFavorite   !== undefined) input['isFavorite']   = updates.isFavorite;
    if (updates.lastMadeDate !== undefined) input['lastMadeDate'] = updates.lastMadeDate;

    const data = await this.query<{ updateRecipe: unknown }>(
      `mutation UpdateRecipe($input: UpdateRecipeInput!) {
        updateRecipe(input: $input) {
          id name description tags servings prepMinutes cookMinutes
          isFavorite lastMadeDate updatedAt
        }
      }`,
      { input }
    );
    return data.updateRecipe;
  }

  // ── DELETE RECIPE ─────────────────────────────────────────────────────────
  async deleteRecipe(id: string): Promise<{ deletedIngredientCount: number }> {
    // 1. Fetch all ingredient IDs (AppSync does not cascade deletes)
    const recipeData = await this.query<{
      getRecipe: { ingredients: { items: Array<{ id: string }> } };
    }>(
      `query GetRecipeIngredientIds($id: ID!) {
        getRecipe(id: $id) {
          ingredients { items { id } }
        }
      }`,
      { id }
    );

    const ingredientIds = recipeData.getRecipe.ingredients.items.map((i) => i.id);

    // 2. Delete each ingredient
    for (const ingredientId of ingredientIds) {
      await this.query(
        `mutation DeleteRecipeIngredient($input: DeleteRecipeIngredientInput!) {
          deleteRecipeIngredient(input: $input) { id }
        }`,
        { input: { id: ingredientId } }
      );
    }

    // 3. Delete the recipe itself
    await this.query(
      `mutation DeleteRecipe($input: DeleteRecipeInput!) {
        deleteRecipe(input: $input) { id }
      }`,
      { input: { id } }
    );

    return { deletedIngredientCount: ingredientIds.length };
  }

  // ── CREATE RECIPE INGREDIENT(S) ───────────────────────────────────────────
  async createRecipeIngredient(
    recipeId: string,
    ingredient: RecipeIngredientInput
  ): Promise<{ id: string; name: string }> {
    const input: Record<string, unknown> = { recipeId, name: ingredient.name };
    if (ingredient.amount       !== undefined) input['amount']       = ingredient.amount;
    if (ingredient.unit         !== undefined) input['unit']         = ingredient.unit;
    if (ingredient.catalogItemId !== undefined) input['catalogItemId'] = ingredient.catalogItemId;
    if (ingredient.notes        !== undefined) input['notes']        = ingredient.notes;
    if (ingredient.sortOrder    !== undefined) input['sortOrder']    = ingredient.sortOrder;

    const data = await this.query<{
      createRecipeIngredient: { id: string; name: string };
    }>(
      `mutation CreateRecipeIngredient($input: CreateRecipeIngredientInput!) {
        createRecipeIngredient(input: $input) { id name }
      }`,
      { input }
    );
    return data.createRecipeIngredient;
  }

  // ── DELETE RECIPE INGREDIENT ──────────────────────────────────────────────
  async deleteRecipeIngredient(ingredientId: string): Promise<{ id: string }> {
    const data = await this.query<{ deleteRecipeIngredient: { id: string } }>(
      `mutation DeleteRecipeIngredient($input: DeleteRecipeIngredientInput!) {
        deleteRecipeIngredient(input: $input) { id }
      }`,
      { input: { id: ingredientId } }
    );
    return data.deleteRecipeIngredient;
  }

  // ── RECONCILE LIST ────────────────────────────────────────────────────────
  async reconcileList(
    listId: string,
    actualSpend: number,
    itemUpdates: ReconcileItemUpdate[]
  ): Promise<{ list_id: string; actual_spend: number; items_updated: number }> {
    await Promise.all(
      itemUpdates.map((u) => this.updateListItem(listId, u.item_id, u.checked, u.notes))
    );
    await this.completeList(listId, actualSpend);
    return { list_id: listId, actual_spend: actualSpend, items_updated: itemUpdates.length };

  }

  // ── CREATE MEMBER ─────────────────────────────────────────────────────────
  async createMember(input: MemberInput): Promise<{ id: string }> {
    const memberInput: Record<string, unknown> = {
      cognitoSub:  input.cognitoSub,
      displayName: input.displayName,
      email:       input.email,
    };
    if (input.role  !== undefined) memberInput['role']  = input.role;
    if (input.color !== undefined) memberInput['color'] = input.color;

    const data = await this.query<{ createMember: { id: string } }>(
      `mutation CreateMember($input: CreateMemberInput!) {
        createMember(input: $input) { id }
      }`,
      { input: memberInput }
    );
    return { id: data.createMember.id };
  }

  // ── LIST MEMBERS ──────────────────────────────────────────────────────────
  async listMembers(): Promise<unknown[]> {
    type ListMembersPage = {
      listMembers: {
        items: Array<Record<string, unknown>>;
        nextToken?: string | null;
      };
    };

    const items: Array<Record<string, unknown>> = [];
    let cursor: string | null | undefined = undefined;

    for (;;) {
      const page: ListMembersPage = await this.query<ListMembersPage>(
        `query ListMembers($nextToken: String) {
          listMembers(limit: 100, nextToken: $nextToken) {
            items {
              id cognitoSub displayName email role color createdAt updatedAt
            }
            nextToken
          }
        }`,
        { nextToken: cursor }
      );
      items.push(...page.listMembers.items);
      cursor = page.listMembers.nextToken;
      if (!cursor) break;
    }

    return items;
  }

  // ── GET MEMBER (by id or cognitoSub) ─────────────────────────────────────
  async getMember(idOrSub: string, by: 'id' | 'cognitoSub' = 'id'): Promise<unknown> {
    if (by === 'id') {
      const data = await this.query<{ getMember: Record<string, unknown> | null }>(
        `query GetMember($id: ID!) {
          getMember(id: $id) {
            id cognitoSub displayName email role color createdAt updatedAt
          }
        }`,
        { id: idOrSub }
      );
      if (!data.getMember) throw new Error(`Member not found: ${idOrSub}`);
      return data.getMember;
    }

    // Filter by cognitoSub
    const data = await this.query<{
      listMembers: { items: Array<Record<string, unknown>> };
    }>(
      `query GetMemberBySub($filter: ModelMemberFilterInput) {
        listMembers(filter: $filter) {
          items {
            id cognitoSub displayName email role color createdAt updatedAt
          }
        }
      }`,
      { filter: { cognitoSub: { eq: idOrSub } } }
    );
    const items = data.listMembers.items;
    if (items.length === 0) throw new Error(`Member not found for cognitoSub: ${idOrSub}`);
    if (items.length > 1) throw new Error(`Multiple members found for cognitoSub: ${idOrSub} — data integrity issue`);
    return items[0];
  }

  // ── GET MEMBER (by email) ──────────────────────────────────────────────────
  async getMemberByEmail(email: string): Promise<unknown> {
    const normalized = email.trim();
    const data = await this.query<{
      listMembers: { items: Array<Record<string, unknown>> };
    }>(
      `query GetMemberByEmail($filter: ModelMemberFilterInput) {
        listMembers(filter: $filter) {
          items {
            id cognitoSub displayName email role color createdAt updatedAt
          }
        }
      }`,
      { filter: { email: { eq: normalized } } }
    );
    let items = data.listMembers.items;
    if (items.length === 0) {
      const allMembers = await this.listMembers() as Array<Record<string, unknown>>;
      const target = normalized.toLowerCase();
      items = allMembers.filter((member) =>
        String(member['email'] ?? '').toLowerCase() === target
      );
    }
    if (items.length === 0) throw new Error(`Member not found for email: ${email}`);
    if (items.length > 1) throw new Error(`Multiple members found for email: ${email} — data integrity issue`);
    return items[0];
  }

  // ── CREATE MEAL PLAN ──────────────────────────────────────────────────────
  async createMealPlan(input: MealPlanInput): Promise<{ id: string }> {
    const planInput: Record<string, unknown> = {
      weekOf: input.weekOf,
      type:   input.type,
    };
    if (input.memberId !== undefined) planInput['memberId'] = input.memberId ?? null;

    const data = await this.query<{ createMealPlan: { id: string } }>(
      `mutation CreateMealPlan($input: CreateMealPlanInput!) {
        createMealPlan(input: $input) { id }
      }`,
      { input: planInput }
    );
    return { id: data.createMealPlan.id };
  }

  // ── GET MEAL PLAN (with sorted entries) ───────────────────────────────────
  async getMealPlan(planId: string): Promise<unknown> {
    const data = await this.query<{
      getMealPlan: Record<string, unknown> & {
        entries: { items: Array<Record<string, unknown>> };
      };
    }>(
      `query GetMealPlan($id: ID!) {
        getMealPlan(id: $id) {
          id weekOf type memberId createdAt updatedAt
          entries {
            items {
              id planId dayOfWeek mealType recipeId label notes createdAt updatedAt
            }
          }
        }
      }`,
      { id: planId }
    );

    const plan = data.getMealPlan;
    return {
      ...plan,
      entries: sortMealEntries(plan.entries.items),
    };
  }

  // ── LIST MEAL PLANS ───────────────────────────────────────────────────────
  async listMealPlans(
    limit = 20,
    weekOf?: string,
    type?: string,
    memberId?: string
  ): Promise<unknown[]> {
    const filter: Record<string, { eq: string }> = {};
    if (weekOf) filter['weekOf'] = { eq: weekOf };
    if (type) filter['type'] = { eq: type };
    if (memberId) filter['memberId'] = { eq: memberId };

    const data = await this.query<{
      listMealPlans: { items: Array<Record<string, unknown>> };
    }>(
      `query ListMealPlans($limit: Int, $filter: ModelMealPlanFilterInput) {
        listMealPlans(limit: $limit, filter: $filter) {
          items {
            id weekOf type memberId createdAt updatedAt
          }
        }
      }`,
      {
        limit,
        filter: Object.keys(filter).length > 0 ? filter : null,
      }
    );

    return data.listMealPlans.items;
  }

  // ── UPDATE MEAL PLAN ──────────────────────────────────────────────────────
  async updateMealPlan(
    planId: string,
    updates: Partial<MealPlanInput>
  ): Promise<unknown> {
    const input: Record<string, unknown> = { id: planId };
    if (updates.weekOf   !== undefined) input['weekOf']   = updates.weekOf;
    if (updates.type     !== undefined) input['type']     = updates.type;
    if (updates.memberId !== undefined) input['memberId'] = updates.memberId ?? null;

    const data = await this.query<{ updateMealPlan: unknown }>(
      `mutation UpdateMealPlan($input: UpdateMealPlanInput!) {
        updateMealPlan(input: $input) {
          id weekOf type memberId updatedAt
        }
      }`,
      { input }
    );
    return data.updateMealPlan;
  }

  // ── DELETE MEAL PLAN (cascades entries manually) ──────────────────────────
  async deleteMealPlan(planId: string): Promise<{ deletedEntryCount: number }> {
    // 1. Fetch all entry IDs across all pages (AppSync does not cascade deletes)
    const entryIds: string[] = [];
    let nextToken: string | null | undefined = undefined;

    type PlanPageResult = {
      getMealPlan: {
        entries: {
          items: Array<{ id: string }>;
          nextToken?: string | null;
        };
      } | null;
    };

    do {
      const planData: PlanPageResult = await this.query<PlanPageResult>(
        `query GetMealPlanEntryIds($id: ID!, $nextToken: String) {
          getMealPlan(id: $id) {
            entries(nextToken: $nextToken) {
              items { id }
              nextToken
            }
          }
        }`,
        { id: planId, nextToken }
      );

      const entries = planData.getMealPlan?.entries;
      if (!entries) break;

      entryIds.push(...entries.items.map((e: { id: string }) => e.id));
      nextToken = entries.nextToken;
    } while (nextToken);
    // 2. Delete entries with limited concurrency to reduce latency without
    // overwhelming AppSync, while tracking any failures.
    const failedEntryIds: string[] = [];
    const concurrency = Math.min(5, Math.max(entryIds.length, 1));
    let nextIndex = 0;

    const deleteNextEntry = async (): Promise<void> => {
      while (true) {
        const currentIndex = nextIndex++;
        if (currentIndex >= entryIds.length) {
          return;
        }

        const entryId = entryIds[currentIndex];
        try {
          await this.query(
            `mutation DeleteMealEntry($input: DeleteMealEntryInput!) {
              deleteMealEntry(input: $input) { id }
            }`,
            { input: { id: entryId } }
          );
        } catch {
          failedEntryIds.push(entryId);
        }
      }
    };

    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        await deleteNextEntry();
      })
    );

    if (failedEntryIds.length > 0) {
      throw new Error(
        `Failed to delete meal plan entries for plan ${planId}: ${failedEntryIds.join(', ')}`
      );
    }

    // 3. Delete the plan
    await this.query(
      `mutation DeleteMealPlan($input: DeleteMealPlanInput!) {
        deleteMealPlan(input: $input) { id }
      }`,
      { input: { id: planId } }
    );

    return { deletedEntryCount: entryIds.length };
  }

  // ── CREATE MEAL ENTRY ─────────────────────────────────────────────────────
  async createMealEntry(
    planId: string,
    input: MealEntryInput
  ): Promise<{ id: string }> {
    const entryInput: Record<string, unknown> = {
      planId,
      dayOfWeek: input.dayOfWeek,
      mealType:  input.mealType,
    };
    if (input.recipeId !== undefined) entryInput['recipeId'] = input.recipeId ?? null;
    if (input.label    !== undefined) entryInput['label']    = input.label    ?? null;
    if (input.notes    !== undefined) entryInput['notes']    = input.notes    ?? null;

    const data = await this.query<{ createMealEntry: { id: string } }>(
      `mutation CreateMealEntry($input: CreateMealEntryInput!) {
        createMealEntry(input: $input) { id }
      }`,
      { input: entryInput }
    );
    return { id: data.createMealEntry.id };
  }

  // ── UPDATE MEAL ENTRY ─────────────────────────────────────────────────────
  async updateMealEntry(
    entryId: string,
    updates: Partial<MealEntryInput>
  ): Promise<unknown> {
    const input: Record<string, unknown> = { id: entryId };
    if (updates.dayOfWeek !== undefined) input['dayOfWeek'] = updates.dayOfWeek;
    if (updates.mealType  !== undefined) input['mealType']  = updates.mealType;
    if (updates.recipeId  !== undefined) input['recipeId']  = updates.recipeId  ?? null;
    if (updates.label     !== undefined) input['label']     = updates.label     ?? null;
    if (updates.notes     !== undefined) input['notes']     = updates.notes     ?? null;

    const data = await this.query<{ updateMealEntry: unknown }>(
      `mutation UpdateMealEntry($input: UpdateMealEntryInput!) {
        updateMealEntry(input: $input) {
          id planId dayOfWeek mealType recipeId label notes updatedAt
        }
      }`,
      { input }
    );
    return data.updateMealEntry;
  }

  // ── DELETE MEAL ENTRY ─────────────────────────────────────────────────────
  async deleteMealEntry(entryId: string): Promise<{ id: string }> {
    const data = await this.query<{ deleteMealEntry: { id: string } }>(
      `mutation DeleteMealEntry($input: DeleteMealEntryInput!) {
        deleteMealEntry(input: $input) { id }
      }`,
      { input: { id: entryId } }
    );
    return data.deleteMealEntry;
  }

  // ── WORKOUT PROGRAMS ───────────────────────────────────────────────────────
  async getActiveWorkoutProgram(memberId: string): Promise<Record<string, unknown> | null> {
    const data = await this.query<{
      listWorkoutPrograms: { items: Array<Record<string, unknown>> };
    }>(
      `query GetActiveWorkoutProgram($filter: ModelWorkoutProgramFilterInput) {
        listWorkoutPrograms(limit: 20, filter: $filter) {
          items {
            id memberId name description split isActive createdAt updatedAt
          }
        }
      }`,
      {
        filter: {
          memberId: { eq: memberId },
          isActive: { eq: true },
        },
      }
    );
    const sorted = [...data.listWorkoutPrograms.items].sort((a, b) =>
      String(b['updatedAt'] ?? '').localeCompare(String(a['updatedAt'] ?? ''))
    );
    return sorted[0] ?? null;
  }

  async getWorkoutDay(dayId: string): Promise<Record<string, unknown> | null> {
    const data = await this.query<{ getWorkoutDay: Record<string, unknown> | null }>(
      `query GetWorkoutDay($id: ID!) {
        getWorkoutDay(id: $id) {
          id programId memberId dayLabel type sortOrder exercises createdAt updatedAt
        }
      }`,
      { id: dayId }
    );
    return data.getWorkoutDay;
  }

  async listWorkoutDays(memberId: string, programId: string): Promise<Array<Record<string, unknown>>> {
    const data = await this.query<{
      listWorkoutDays: {
        items: Array<Record<string, unknown>>;
      };
    }>(
      `query ListWorkoutDays($filter: ModelWorkoutDayFilterInput) {
        listWorkoutDays(limit: 1000, filter: $filter) {
          items {
            id programId memberId dayLabel type sortOrder exercises createdAt updatedAt
          }
        }
      }`,
      {
        filter: {
          memberId: { eq: memberId },
          programId: { eq: programId },
        },
      }
    );
    return [...data.listWorkoutDays.items].sort(
      (a, b) => Number(a['sortOrder'] ?? 0) - Number(b['sortOrder'] ?? 0)
    );
  }

  async listWorkoutSessions(
    memberId: string,
    options?: {
      dayId?: string;
      programId?: string;
      completedAt?: string;
      completedAtGte?: string;
      limit?: number;
    }
  ): Promise<Array<Record<string, unknown>>> {
    type WorkoutSessionsPage = {
      listWorkoutSessions: {
        items: Array<Record<string, unknown>>;
        nextToken?: string | null;
      };
    };

    const filter: Record<string, unknown> = {
      memberId: { eq: memberId },
    };
    if (options?.dayId) filter['dayId'] = { eq: options.dayId };
    if (options?.programId) filter['programId'] = { eq: options.programId };
    if (options?.completedAt) filter['completedAt'] = { eq: options.completedAt };
    if (options?.completedAtGte) filter['completedAt'] = { ge: options.completedAtGte };

    const target = Math.max(1, options?.limit ?? 200);
    const pageLimit = Math.min(100, target);
    const collected: Array<Record<string, unknown>> = [];
    let nextToken: string | null | undefined = undefined;

    do {
      const page: WorkoutSessionsPage = await this.query<WorkoutSessionsPage>(
        `query ListWorkoutSessions($limit: Int, $nextToken: String, $filter: ModelWorkoutSessionFilterInput) {
          listWorkoutSessions(limit: $limit, nextToken: $nextToken, filter: $filter) {
            items {
              id memberId programId dayId completedAt durationMinutes notes createdAt updatedAt
            }
            nextToken
          }
        }`,
        {
          limit: pageLimit,
          nextToken,
          filter,
        }
      );
      collected.push(...page.listWorkoutSessions.items);
      nextToken = page.listWorkoutSessions.nextToken;
    } while (nextToken && collected.length < target);

    return [...collected]
      .sort((a, b) => {
        const completedDiff = String(b['completedAt'] ?? '').localeCompare(String(a['completedAt'] ?? ''));
        if (completedDiff !== 0) return completedDiff;
        return String(b['createdAt'] ?? '').localeCompare(String(a['createdAt'] ?? ''));
      })
      .slice(0, target);
  }

  async createWorkoutSession(input: WorkoutSessionInput): Promise<Record<string, unknown>> {
    const sessionInput: Record<string, unknown> = {
      memberId: input.memberId,
      programId: input.programId,
      dayId: input.dayId,
      completedAt: input.completedAt,
    };
    if (input.durationMinutes !== undefined) sessionInput['durationMinutes'] = input.durationMinutes;
    if (input.notes !== undefined) sessionInput['notes'] = input.notes;

    const data = await this.query<{ createWorkoutSession: Record<string, unknown> }>(
      `mutation CreateWorkoutSession($input: CreateWorkoutSessionInput!) {
        createWorkoutSession(input: $input) {
          id memberId programId dayId completedAt durationMinutes notes createdAt updatedAt
        }
      }`,
      { input: sessionInput }
    );
    return data.createWorkoutSession;
  }
}
