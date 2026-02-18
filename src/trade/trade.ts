import { ClobClient, OrderType, Side } from "@polymarket/clob-client";
import { trade } from "..";
import { purchased_token_global, set_purchased_token } from "../services/ws_rtds";

export class Trade {
    upTokenId: string;
    downTokenId: string;

    authorizedClob: ClobClient

    constructor(
        upTokenId: string,
        downTokenId: string,
        authorizedClob: ClobClient
    ) {
        this.upTokenId = upTokenId;
        this.downTokenId = downTokenId;

        this.authorizedClob = authorizedClob;
    }

    make_trading_decision = function (
        delta: number,
        remainingSec: number,
        volatility1: number,
        volatility2: number,
        upTokenAskPrice: number,
        upTokenBidPrice: number,
        downTokenAskPrice: number,
        downTokenBidPrice: number,
    ): void {
        if (volatility1 * volatility2 < 0 || purchased_token_global) return;

        globalThis.__CONFIG__.trade_1.entry.forEach(element => {
            if (
                element.entry_remaining_sec_down <= remainingSec &&
                element.entry_remaining_sec_up > remainingSec &&
                Math.abs(delta) >= element.min &&
                Math.abs(delta) < element.max
            ) {
                if (delta >= 0) {
                    trade.buyUpToken(upTokenBidPrice, element.amount)
                } else {
                    trade.buyDownToken(downTokenBidPrice, element.amount)
                }
            }
        });
    };

    buyUpToken = async function (price: number, shareCount: number): Promise<void> {
        if (!purchased_token_global) {
            try {
                console.time("buyUpToken");
    
                set_purchased_token(true)
    
                const order = await this.authorizedClob.createOrder({
                    tokenID: this.upTokenId,
                    price: price,
                    side: Side.BUY,
                    size: shareCount,
                });
    
                console.log("✅ Order created successfully:", order);
    
                const postResult = await this.authorizedClob.postOrder(order, OrderType.GTC);
                console.log("✅ Order posted successfully:", postResult);
    
                console.timeEnd("buyUpToken");
            } catch (error) {
                
            }
        }
    };

    buyDownToken = async function (price: number, shareCount: number): Promise<void> {
        if (!purchased_token_global) {
            try {
                console.time("buyDownToken");
    
                set_purchased_token(true)
    
                const order = await this.authorizedClob.createOrder({
                    tokenID: this.downTokenId,
                    price: price,
                    side: Side.BUY,
                    size: shareCount,
                });
    
                console.log("✅ Order created successfully:", order);
    
                const postResult = await this.authorizedClob.postOrder(order, OrderType.GTC);
                console.log("✅ Order posted successfully:", postResult);
    
                console.timeEnd("buyDownToken");
            } catch (error) {
                
            }
        }
    };
}