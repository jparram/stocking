/**
 * Kroger Products API client.
 * Harris Teeter is a Kroger subsidiary — same API, filtered by location.
 * Uses client_credentials OAuth flow (no user login required).
 *
 * Pricing requires a locationId — use the Locations API to find your
 * nearest HT store. Pass HT_LOCATION_ID in env vars.
 *
 * Fallback: if a location-scoped search returns 0 results (cert env gap),
 * retries catalog-wide without location (no pricing, but full product coverage).
 */

const TOKEN_URL = 'https://api-ce.kroger.com/v1/connect/oauth2/token';
const PRODUCTS_URL = 'https://api-ce.kroger.com/v1/products';

export interface KrogerProduct {
  productId: string;
  description: string;
  brand?: string;
  categories?: string[];
  items?: Array<{
    size?: string;
    price?: { regular?: number; promo?: number };
  }>;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export class KrogerClient {
  private clientId: string;
  private clientSecret: string;
  private locationId?: string;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(clientId: string, clientSecret: string, locationId?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.locationId = locationId;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.token;
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=product.compact',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kroger token error ${res.status}: ${text}`);
    }
    const data = await res.json() as TokenResponse;
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.token;
  }

  private async doSearch(token: string, query: string, limit: number, locationId?: string): Promise<KrogerProduct[]> {
    const params = new URLSearchParams({
      'filter.term': query,
      'filter.limit': String(Math.min(limit, 50)),
    });
    if (locationId) {
      params.set('filter.locationId', locationId);
    }
    const res = await fetch(`${PRODUCTS_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kroger products error ${res.status}: ${text}`);
    }
    const data = await res.json() as { data?: KrogerProduct[] };
    return data.data ?? [];
  }

  async searchProducts(query: string, limit = 10): Promise<KrogerProduct[]> {
    const token = await this.getToken();
    const results = await this.doSearch(token, query, limit, this.locationId);
    // Fallback: cert env may have gaps per store — retry catalog-wide (no pricing)
    if (results.length === 0 && this.locationId) {
      return this.doSearch(token, query, limit);
    }
    return results;
  }
}
