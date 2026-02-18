import { sleep } from "../utils";
import { set_price_to_beat } from "./ws_rtds";

export const getEvent = async (slug: string) => {
  const response = await fetch(
    `https://gamma-api.polymarket.com/events/slug/${slug}`
  );
  const event = await response.json();
  return event;
}

export const getMarket = async (slug: string) => {
  const response = await fetch(
    `https://gamma-api.polymarket.com/markets/slug/${slug}`
  );
  const market = await response.json();
  return market;
}

export const getPriceToBeat = async (
  symbol: string,
  eventStartTime: string,
  endDate: string,
  variant: "fiveminute" | "fifteenminute"
) => {
  const url = new URL("https://polymarket.com/api/crypto/crypto-price");

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("eventStartTime", eventStartTime);
  url.searchParams.set("variant", variant);
  url.searchParams.set("endDate", endDate);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch price: ${response.status} - ${text}`);
  }

  return await response.json();
};
