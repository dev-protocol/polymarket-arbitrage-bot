import { RealTimeDataClient } from "@polymarket/real-time-data-client";
import { orderBook } from "./ws_clob";
import { endTimestampGlobal, marketPeriod, startTimestampGlobal, trade, volatility } from "..";
import { getCurrentTimeMs } from "../utils";

export let price_to_beat_global: number = 0;
export let current_price: number = 0;

export const set_price_to_beat = (price_to_beat) => {
    price_to_beat_global = price_to_beat;
}

export let purchased_token_global: boolean = false;

export const set_purchased_token = (purchased_token: boolean) => {
    purchased_token_global = purchased_token
}

let subscriptions: Array<{ topic: string; type: string; filters: string }> = [];

export function setSubscriptions(subscriptionList: Array<{ topic: string; type: string; filters: string }>) {
    console.log("📝 RTDS: Setting subscriptions:", subscriptionList);
    subscriptions = subscriptionList;
}

export function createRTDSClient(
    onConnectCallback?: () => void,
    onErrorCallback?: (error: any) => void
): RealTimeDataClient {
    const client = new RealTimeDataClient({
        host: "wss://ws-live-data.polymarket.com",
        onConnect: (client) => {

            if (subscriptions.length > 0) {
                client.subscribe({
                    subscriptions: subscriptions,
                });
            }

            if (onConnectCallback) {
                onConnectCallback();
            }
        },
        onMessage: (_client, message) => {
            if (message.payload["symbol"] === "btc/usd") {

                if (message.payload["value"] == undefined) {
                    const priceBeat = message.payload["data"].find(e => e.timestamp == startTimestampGlobal || e.timestamp == endTimestampGlobal);

                    if (priceBeat != undefined) set_price_to_beat(priceBeat["value"])
                } else {

                    current_price = message.payload["value"]

                    const remainingSec = endTimestampGlobal - message.payload["timestamp"] / 1000;
                    const delta = current_price - price_to_beat_global;

                    if (message.payload["timestamp"] == endTimestampGlobal * 1000 || message.payload["timestamp"] == startTimestampGlobal * 1000) set_price_to_beat(current_price)

                    const upTokenAskPrice = orderBook[trade.upTokenId]?.asks.slice(-1)[0]?.price;
                    const upTokenBidPrice = orderBook[trade.upTokenId]?.bids.slice(-1)[0]?.price;

                    const downTokenAskPrice = orderBook[trade.downTokenId]?.asks.slice(-1)[0]?.price;
                    const downTokenBidPrice = orderBook[trade.downTokenId]?.bids.slice(-1)[0]?.price;

                    if (price_to_beat_global != 0 && remainingSec > 0) {
                        volatility.insertHistory(delta, remainingSec)

                        const vol = volatility.getVolatility(remainingSec, delta)
                        const volatility1 = delta - Math.abs(vol?.delta)
                        const volatility2 = delta + Math.abs(vol?.delta)

                        console.log(
                            "Price To Beat".padEnd(12),
                            String(price_to_beat_global).padEnd(10),
                            "Delta |".padEnd(8),
                            String(price_to_beat_global == 0 ? 0 : (delta).toFixed(2)).padEnd(8),
                            "| Current Price".padEnd(16),
                            String(current_price?.toFixed(8) ?? 'undefined').padEnd(18),
                            volatility1,
                            volatility2,
                            "| UP ASK/BID ".padEnd(10),
                            upTokenAskPrice,
                            "/",
                            upTokenBidPrice,
                            "DOWN ASK/BID ".padEnd(10),
                            downTokenAskPrice,
                            "/",
                            downTokenBidPrice,
                            "| Remaining Sec".padEnd(15),
                            remainingSec.toFixed(3),
                            "/",
                            marketPeriod
                        );

                        trade.make_trading_decision(
                            delta,
                            remainingSec,
                            volatility1,
                            volatility2,
                            upTokenAskPrice,
                            upTokenBidPrice,
                            downTokenAskPrice,
                            downTokenBidPrice,
                        )
                    }
                }
            }
        },
        onStatusChange: (status) => {
            if (String(status).toLowerCase().includes("disconnect") || String(status).toLowerCase().includes("error")) {
                if (onErrorCallback) {
                    onErrorCallback(new Error(`RTDS status: ${status}`));
                }
            }
        },
    });

    client.connect();
    return client;
}

// Legacy export for backward compatibility (deprecated)
export const RTDS_CLIENT = createRTDSClient();
