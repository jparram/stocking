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

export class GraphQLClient {
  constructor(
    private endpoint: string,
    private apiKey: string
  ) {}

  private async query<T>(
    gqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
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
      { limit }
    );

    let lists = data.listShoppingLists.items as Array<Record<string, unknown>>;
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
}
