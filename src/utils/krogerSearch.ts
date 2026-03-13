const MCP_URL = import.meta.env['VITE_MCP_URL'] as string | undefined;
const MCP_TOKEN = import.meta.env['VITE_MCP_TOKEN'] as string | undefined;

export interface KrogerSearchResult {
  productId: string;
  name: string;
  brand?: string;
  categories?: string[];
  size?: string;
  price?: number;
  promoPrice?: number;
}

export async function searchKrogerProducts(query: string, limit = 15): Promise<KrogerSearchResult[]> {
  if (!MCP_URL) throw new Error('VITE_MCP_URL not configured');
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MCP_TOKEN ? { Authorization: `Bearer ${MCP_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'search_products', arguments: { query, limit } },
    }),
  });
  const data = await res.json() as {
    result?: { content?: Array<{ text?: string }> };
    error?: { message: string };
  };
  if (!res.ok && !data.error) throw new Error(`Search failed: ${res.status}`);
  if (data.error) {
    const msg = data.error.message;
    if (msg.includes('invalid credentials') || msg.includes('401')) {
      throw new Error('Harris Teeter search unavailable — Kroger API credentials pending activation');
    }
    throw new Error(msg);
  }
  const text = data.result?.content?.[0]?.text ?? '[]';
  return JSON.parse(text) as KrogerSearchResult[];
}
