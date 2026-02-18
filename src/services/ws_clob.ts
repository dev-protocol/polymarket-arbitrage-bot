import { WebSocket } from "ws";

export let orderBook: any = {};


let market: any = null;

export function setMarket(marketData: any) {
    market = marketData;
}

export function createUserWebSocket(): WebSocket {
    const ws = new WebSocket("wss://ws-subscriptions-clob.polymarket.com/ws/market");

    ws.onmessage = async (event) => {
        try {
            if (event.data.toString() === "PONG") {
                return;
            }

            const data = JSON.parse(event.data.toString());

            if (data.event_type === "book") {
                orderBook[data.asset_id] = {
                    bids: data.bids,
                    asks: data.asks
                };
            }

        } catch (error) {
            console.error("❌ Error parsing websocket message:", error);
            console.log("Raw message:", event.data);
        }
    };

    ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
    };

    ws.onclose = (event) => {
        console.log("🔌 WebSocket closed:", event.code, event.reason);
    };

    return ws;
}

// Legacy export for backward compatibility (deprecated)
export const USER_WS = createUserWebSocket();