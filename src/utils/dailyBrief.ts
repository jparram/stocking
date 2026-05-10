const MCP_URL = import.meta.env['VITE_MCP_URL'] as string | undefined;
const MCP_TOKEN = import.meta.env['VITE_MCP_TOKEN'] as string | undefined;

export interface DailyBriefHousehold {
  shopping_due?: boolean;
  shopping_store?: string | null;
  shopping_list_id?: string | null;
  today_dinner?: string | null;
}

export interface DailyBrief {
  available: boolean;
  date: string;
  headline: string | null;
  household: DailyBriefHousehold | null;
}

interface RpcResponse {
  result?: { content?: Array<{ text?: string }> };
  error?: { message?: string };
}

export async function getDailyBrief(date?: string): Promise<DailyBrief | null> {
  if (!MCP_URL) return null;

  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MCP_TOKEN ? { Authorization: `Bearer ${MCP_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_daily_brief',
        arguments: date ? { date } : {},
      },
    }),
  });

  const data = (await response.json()) as RpcResponse;
  if (!response.ok && !data.error) {
    throw new Error(`Daily brief fetch failed: ${response.status}`);
  }
  if (data.error) {
    throw new Error(data.error.message ?? 'Daily brief fetch failed');
  }

  const text = data.result?.content?.[0]?.text;
  if (!text) return null;

  return JSON.parse(text) as DailyBrief;
}
