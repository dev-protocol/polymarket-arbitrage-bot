/**
 * Inspect a proxy wallet's buy/sell history for a market.
 * Reads [monitor] from trade.toml. No CLI args.
 *
 * trade.toml:
 *   [monitor]
 *   proxy_wallet_address = "0x..."
 *   market_slug = "bitcoin-up-or-down-january-27-12pm-et"
 *
 * Usage: npm run inspect
 */

import "dotenv/config";
import { loadConfig } from "./config/toml";
import { getEvent, getMarket } from "./services/gamma";

const DATA_API_BASE = "https://data-api.polymarket.com";

interface DataApiTrade {
  proxyWallet: string;
  side: "BUY" | "SELL";
  asset: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number;
  title?: string;
  slug?: string;
  outcome?: string;
  outcomeIndex?: number;
  transactionHash?: string;
}

function getMonitorConfig(): { wallet: string; slug: string } {
  const config = loadConfig();
  const m = config.monitor;
  
  return { wallet: m.proxy_wallet_address, slug: m.market_slug };
}

async function getConditionIdAndTokensFromSlug(slug: string): Promise<{ conditionId: string; upTokenId: string }> {
  // Try market-by-slug first
  const marketRes = await getMarket(slug) as Record<string, unknown>;
  if (marketRes && !(marketRes.type === "error" || "error" in marketRes)) {
    const cid = marketRes.conditionId ?? marketRes.condition_id;
    if (typeof cid === "string") {
      let upTokenId = "";
      if (marketRes.clobTokenIds) {
        const ids = typeof marketRes.clobTokenIds === "string" ? JSON.parse(marketRes.clobTokenIds as string) : marketRes.clobTokenIds;
        upTokenId = (ids as string[])[0] ?? "";
      }
      return { conditionId: cid, upTokenId };
    }
  }
  // Fallback: event-by-slug (crypto markets use event slugs like btc-updown-15m-<ts>)
  const event = await getEvent(slug) as Record<string, unknown>;
  const markets = event?.markets;
  if (Array.isArray(markets) && markets.length > 0) {
    const m = markets[0] as Record<string, unknown>;
    const cid = m.conditionId ?? m.condition_id;
    if (typeof cid === "string") {
      let upTokenId = "";
      if (m.clobTokenIds) {
        const ids = typeof m.clobTokenIds === "string" ? JSON.parse(m.clobTokenIds as string) : m.clobTokenIds;
        upTokenId = (ids as string[])[0] ?? "";
      }
      return { conditionId: cid, upTokenId };
    }
  }
  throw new Error(
    `Could not resolve conditionId for slug "${slug}". Tried gamma markets/slug and events/slug. ` +
    `Use a market or event slug that exists in Polymarket (e.g. from the market URL).`
  );
}

async function fetchTrades(user: string, conditionId: string, limit = 1000): Promise<DataApiTrade[]> {
  const url = new URL(`${DATA_API_BASE}/trades`);
  url.searchParams.set("user", user);
  url.searchParams.set("market", conditionId);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`data-api trades failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function formatOutcome(t: DataApiTrade, upTokenId: string): string {
  if (t.outcome != null && t.outcome !== "") return t.outcome;
  return t.asset === upTokenId ? "Up" : "Down";
}

function main(): void {
  const { wallet, slug } = getMonitorConfig();

  (async () => {
    console.log(`Market slug: ${slug}`);
    console.log(`Proxy wallet: ${wallet}`);
    console.log("");

    const { conditionId, upTokenId } = await getConditionIdAndTokensFromSlug(slug);
    console.log(`Condition ID: ${conditionId}`);

    const trades = await fetchTrades(wallet, conditionId);
    console.log(`Trades found: ${trades.length}`);
    console.log("");

    if (trades.length === 0) {
      console.log("No trades for this wallet in this market.");
      return;
    }

    // Sort by timestamp descending (newest first)
    trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const rows: string[][] = [
      ["Time", "Side", "Outcome", "Price", "Size", "Tx"],
    ];

    for (const t of trades) {
      const time = t.timestamp ? new Date(t.timestamp * 1000).toISOString() : "-";
      const side = t.side ?? "-";
      const outcome = formatOutcome(t, upTokenId);
      const price = typeof t.price === "number" ? t.price.toFixed(4) : String(t.price ?? "-");
      const size = typeof t.size === "number" ? t.size.toFixed(2) : String(t.size ?? "-");
      const tx = (t.transactionHash ?? "-").slice(0, 10) + (t.transactionHash && t.transactionHash.length > 10 ? "…" : "");
      rows.push([time, side, outcome, price, size, tx]);
    }

    // Simple column widths
    const widths = [24, 6, 6, 10, 10, 14];
    const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = r.map((c, j) => pad(c, widths[j])).join(" ");
      console.log(line);
      if (i === 0) console.log("-".repeat(line.length));
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

main();
