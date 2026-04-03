/**
 * AppSync GraphQL client for the MCP server.
 * Uses API key auth — separate from the user's Cognito session.
 *
 * Requires amplify/data/resource.ts to have:
 *   authorizationModes: {
 *     defaultAuthorizationMode: 'userPool',
 *     apiKeyAuthorizationMode: { expiresInDays: 365 },
 *   }
 * and ShoppingList / ShoppingListItem models to include:
 *   allow.apiKey().to(['create', 'read', 'update'])
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
    // 1. Create the list header
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

    // 2. Create each line item linked to the list
    for (const item of input.items) {
      await this.query(
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
    }

    return { id: listId };
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

    let lists = data.listShoppingLists.items as Array<
      Record<string, unknown>
    >;
    if (store)  lists = lists.filter((l) => l.store === store);
    if (status) lists = lists.filter((l) => l.status === status);
    return lists.slice(0, limit);
  }

  // ── GET LIST ITEMS ────────────────────────────────────────────────────────
  async getListItems(listId: string): Promise<unknown> {
    const data = await this.query<{
      getShoppingList: {
        id: string;
        name: string;
        store: string;
        status: string;
        totalSpend: number;
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

    // Group by category for readability
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
  async completeList(
    listId: string,
    actualSpend?: number
  ): Promise<unknown> {
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

  // ── RECONCILE LIST ────────────────────────────────────────────────────────
  /**
   * Applies a batch of item-level check/note updates and corrects the list's
   * totalSpend in a single logical operation.  All item updates run in parallel
   * for speed; the spend update runs after.
   */
  async reconcileList(
    listId: string,
    actualSpend: number,
    itemUpdates: ReconcileItemUpdate[]
  ): Promise<{ list_id: string; actual_spend: number; items_updated: number }> {
    // Parallel item updates
    await Promise.all(
      itemUpdates.map((u) => this.updateListItem(listId, u.item_id, u.checked, u.notes))
    );

    // Correct the spend
    await this.completeList(listId, actualSpend);

    return {
      list_id: listId,
      actual_spend: actualSpend,
      items_updated: itemUpdates.length,
    };
  }
}
