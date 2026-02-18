# Polymarket 5-Minute Snipe Trading Bot

A **professional-grade 5-minute sniping bot** : Designed for high-frequency trading strategies on short-duration prediction markets, leveraging precise timing and configurable entry rules.

---

## Features

* Real-time monitoring of market orderbooks with 1-second granularity
* Configurable entry rules:

  * Price thresholds (min/max)
  * Remaining seconds until round end
  * Trade amount per entry
* Supports proxy wallets and secure private key management via `.env`
* Modular design for multiple assets (BTC, ETH, SOL, XRP)
* Easily extensible for advanced trading strategies

---

## Requirements

* Node.js >= 20
* NPM >= 9
* Polygon wallet with USDC funding
* Polymarket account with access to the CLOB API

---

## Installation

```bash
git clone <repo_url>
cd polymarket-snipe-bot
npm install
```

---

## Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Configure `.env` with your credentials:

```env
POLYMARKET_PRIVATE_KEY=YOUR_PRIVATE_KEY
PROXY_WALLET_ADDRESS=0x6031b6eed1c97e853c6e0f03ad3ce3529351f96d
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/xxxxxx
```

3. Update `config.toml` with your trading strategy:

```toml
[market]
market_coin = "btc"
market_period = "5"

[trade_1]
entry = [
  { min = 10, max = 500, entry_remaining_sec_down = 1, entry_remaining_sec_up = 2, amount = 5 },
  { min = 20, max = 500, entry_remaining_sec_down = 2, entry_remaining_sec_up = 3, amount = 5 },
  { min = 40, max = 500, entry_remaining_sec_down = 3, entry_remaining_sec_up = 5, amount = 5 },
]

[monitor]
proxy_wallet_address = "0x6031b6eed1c97e853c6e0f03ad3ce3529351f96d"
market_slug = "btc-updown-15m-1769634900"
```

---

## Usage

```bash
node index.js
```

Bot Workflow:

1. Fetch market orderbook data every second
2. Calculate remaining seconds until the round ends
3. Evaluate entry rules for price and timing
4. Place YES/NO orders automatically when conditions are satisfied

---

## Notes

* ⚠️ Polymarket requires **EIP‑712 signed orders** for secure execution
* ⚠️ Ensure your proxy wallet has sufficient **USDC** balance
* ⚠️ Polling is used; consider WebSocket integration for ultra-low latency
* ⚠️ High-risk strategy: test extensively before real capital deployment

---

## Recommended Enhancements

* Real-time WebSocket market subscriptions for lower latency
* Automatic cancellation of stale or unfilled orders
* Multi-market trading support
* Advanced strategies including dynamic thresholds, hedging, and trailing exits

---

## License

MIT License
