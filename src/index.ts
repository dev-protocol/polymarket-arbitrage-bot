import { ClobClient, Side } from "@polymarket/clob-client";
import { WebSocket } from "ws";
import { generateMarketSlug } from "./config";
import type { Coin, MarketConfig, Minutes } from "./types";
import { CHAIN_ID, FUNDER, getMarket, getPrices, HOST, SIGNATURE_TYPE, SIGNER, createUserWebSocket, orderBook, createRTDSClient, setMarket, getPriceToBeat } from "./services";
import { getCurrentTime } from "./utils";
import { loadConfig } from "./config/toml";
import { Trade } from "./trade";
import { current_price, price_to_beat_global, set_purchased_token } from "./services/ws_rtds";
import { Volatility } from "./analysis";
import { redeem } from "./trade/inventory";

loadConfig();

export let trade: Trade;
export let startTimestampGlobal: number;
export let endTimestampGlobal: number;
export let marketPeriod: number;

export const volatility = new Volatility();



const marketConfig: MarketConfig = {
  coin: globalThis.__CONFIG__.market.market_coin as Coin, // btc / eth / sol / xrp
  minutes: parseInt(globalThis.__CONFIG__.market.market_period) as Minutes, // 15 / 60 / 240 / 1440
};

async function main() {
  console.log("SIGNER ", SIGNER);

  const clobClient = new ClobClient(
    HOST,
    CHAIN_ID,
    SIGNER,
  );

  const apiKey = await clobClient.createOrDeriveApiKey();
  console.log("apiKey", apiKey);

  while (true) {

    const { slug, startTimestamp, endTimestamp } = generateMarketSlug(
      marketConfig.coin,
      marketConfig.minutes
    );

    startTimestampGlobal = startTimestamp;
    endTimestampGlobal = endTimestamp;
    marketPeriod = endTimestamp - startTimestamp;

    console.log(`================================================================\n`);
    console.log(`🔍 Searching for market with slug: "${slug}"`);
    console.log(`   Market ends at:${getCurrentTime()} / ${endTimestamp}`);
    console.log(`\n================================================================`);

    const market = await getMarket(slug);

    setMarket(market);

    const upTokenId = JSON.parse(market.clobTokenIds)[0];
    const downTokenId = JSON.parse(market.clobTokenIds)[1];

    console.log("==================================================================================================>")

    const client = new ClobClient(
      HOST,
      CHAIN_ID,
      SIGNER,
      apiKey,
      SIGNATURE_TYPE,
      FUNDER
    );

    trade = new Trade(
      upTokenId,
      downTokenId,
      client
    );

    set_purchased_token(false);

    const USER_WS = createUserWebSocket();

    let RTDS_WS: ReturnType<typeof createRTDSClient>;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 10000);

      let userWsConnected = false;
      let rtdsWsConnected = false;

      const checkBothConnected = () => {
        if (userWsConnected && rtdsWsConnected) {
          clearTimeout(timeout);
          resolve();
        }
      };

      USER_WS.onopen = () => {
        userWsConnected = true;
        checkBothConnected();
      };

      USER_WS.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      RTDS_WS = createRTDSClient(
        () => {
          rtdsWsConnected = true;
          checkBothConnected();
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      );
    });

    USER_WS.send(JSON.stringify({
      type: "market",
      assets_ids: [upTokenId, downTokenId]
    }));

    RTDS_WS.subscribe({
      subscriptions: [
        { topic: "crypto_prices", type: "update", filters: "{\"symbol\":\"BTCUSDT\"}" },
        { topic: "crypto_prices_chainlink", type: "update", filters: "{\"symbol\":\"btc/usd\"}" },
      ],
    });

    console.log(`✅ Subscribed to market updates for tokens: ${upTokenId}, ${downTokenId}`);

    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      USER_WS.send("PING");

      if (price_to_beat_global != 0 && endTimestamp - getCurrentTime() <= 0) {
        if (price_to_beat_global > current_price) {
          console.log("\n\n\n\t\t\t\tDOWN WIN\n\n\n");
        } else {
          console.log("\n\n\n\t\t\t\tUP WIN\n\n\n");
        }

        volatility.clearHistory()
        break;
      }
    }

    if (USER_WS.readyState === WebSocket.OPEN || USER_WS.readyState === WebSocket.CONNECTING) {
      console.log("🔌 Closing websocket connection for market refresh");
      USER_WS.close();
    }

    // Add a small delay before starting the next market cycle
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main();