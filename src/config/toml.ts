import { readFileSync } from "fs";
import { parse } from "@iarna/toml";
import { z } from "zod";

const EntrySchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  entry_remaining_sec_down: z.number().int().nonnegative(),
  entry_remaining_sec_up: z.number().positive(),
  amount: z.number().positive(),
}).refine(v => v.min < v.max, {
  message: "min must be < max",
});

const ConfigSchema = z.object({
  market: z.object({
    market_coin: z.enum(["btc", "eth", "sol", "xrp"]),
    market_period: z.enum(["5", "15", "60", "240", "1440"]),
  }),
  trade_1: z.object({
    entry: z.array(EntrySchema)
      .nonempty("entry cannot be empty"),
  }),
  monitor: z.object({
    proxy_wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
      message: "Invalid EVM wallet address",
    }),
    market_slug: z.string().min(1),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

declare global {
  var __CONFIG__: Config;
}

export function loadConfig(path = "trade.toml"): Config {
  if (!globalThis.__CONFIG__) {
    const raw = parse(readFileSync(path, "utf-8"));
    globalThis.__CONFIG__ = ConfigSchema.parse(raw);
  }
  return globalThis.__CONFIG__;
}
