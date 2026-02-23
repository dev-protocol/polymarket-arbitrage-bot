/**
 * Lightweight TUI helpers for colored output and boxes.
 * Uses chalk + boxen; colors are disabled when stdout is piped (e.g. > log.txt).
 */
import chalk from "chalk";
import boxen from "boxen";

export const tui = {
  /** Section header in a box */
  section(title: string, lines: string[]): string {
    return boxen(lines.join("\n"), {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 1 },
      borderColor: "cyan",
      title: ` ${title} `,
      titleAlignment: "left",
    });
  },

  /** Success message (e.g. order posted) */
  success(msg: string): string {
    return chalk.green("✅ " + msg);
  },

  /** Error message */
  error(msg: string): string {
    return chalk.red("❌ " + msg);
  },

  /** Warning / retry */
  warn(msg: string): string {
    return chalk.yellow("⚠ " + msg);
  },

  /** Dimmed label or secondary info */
  dim(msg: string): string {
    return chalk.dim(msg);
  },

  /** Highlighted value (e.g. slug, token id) */
  highlight(msg: string): string {
    return chalk.cyan(msg);
  },

  /** Bold label */
  label(msg: string): string {
    return chalk.bold(msg);
  },

  /** Big outcome banner (UP WIN / DOWN WIN) */
  outcomeBanner(text: "UP WIN" | "DOWN WIN"): string {
    const content = text === "UP WIN" ? chalk.green.bold(text) : chalk.magenta.bold(text);
    return boxen(content, {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      margin: { top: 1, bottom: 1 },
      borderColor: text === "UP WIN" ? "green" : "magenta",
      borderStyle: "double",
    });
  },

  /** Single-line tick: price, delta, order book, remaining time */
  tickLine(args: {
    priceToBeat: number;
    delta: number;
    currentPrice: number;
    vol1: number;
    vol2: number;
    upAsk: number | undefined;
    upBid: number | undefined;
    downAsk: number | undefined;
    downBid: number | undefined;
    remainingSec: number;
    marketPeriod: number;
  }): string {
    const d = args.delta;
    const deltaStr = args.priceToBeat === 0 ? "0" : d.toFixed(2);
    const deltaColor = d >= 0 ? chalk.green : chalk.red;
    const parts = [
      chalk.dim("Price To Beat"),
      String(args.priceToBeat).padEnd(10),
      chalk.dim("Delta"),
      deltaColor(deltaStr.padEnd(8)),
      chalk.dim("Current"),
      chalk.cyan(String(args.currentPrice?.toFixed(8) ?? "undefined").padEnd(18)),
      chalk.dim("Vol"),
      `${args.vol1.toFixed(2)} / ${args.vol2.toFixed(2)}`,
      chalk.dim("UP"),
      `${args.upAsk ?? "-"} / ${args.upBid ?? "-"}`,
      chalk.dim("DOWN"),
      `${args.downAsk ?? "-"} / ${args.downBid ?? "-"}`,
      chalk.dim("Remaining"),
      chalk.yellow(args.remainingSec.toFixed(3) + " / " + args.marketPeriod),
    ];
    return parts.join("  ");
  },
};
