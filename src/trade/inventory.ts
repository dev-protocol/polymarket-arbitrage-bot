import { ApiKeyCreds, ClobClient } from "@polymarket/clob-client";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet, ethers } from "ethers";
import { POLYMARKET_PRIVATE_KEY, PROXY_WALLET_ADDRESS, RPC_URL } from "../config";
import Safe from "@safe-global/protocol-kit";
import { OperationType } from "@safe-global/types-kit";
import { CTF_ADDRESS, USDCe_ADDRESS } from "../constant";

const ctfInterface = new ethers.utils.Interface([
    "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] indexSets)"
]);

const CTF_ABI = [
    "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] indexSets)",
    "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])"
];

const provider = new JsonRpcProvider(RPC_URL);
const ctfContract = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);


export const redeem = async (conditionId: string, market: any) => {
    console.log("Checking for winning positions to redeem...");

    if (!market.closed) {
        console.log("Market is not closed yet.");
        return;
    }

    try {
        // 1. Check balances in SAFE wallet

        const tokens = market.tokens;
        const tokenIds = tokens.map(t => t.token_id);
        const addresses = tokenIds.map(() => PROXY_WALLET_ADDRESS);
        const balances = await ctfContract.balanceOfBatch(addresses, tokenIds);

        const tokenBalances = tokens.map((token, index) => ({
            ...token,
            balance: balances[index],
            indexSet: index + 1
        }));

        console.log("Safe wallet positions:");
        tokenBalances.forEach(token => {
            console.log(`${token.outcome}: ${ethers.utils.formatUnits(token.balance, 6)} (${token.winner ? 'WINNER' : 'Loser'})`);
        });

        const winningPositions = tokenBalances.filter(token => token.winner && !token.balance.eq(0));

        if (winningPositions.length === 0) {
            console.log("No winning positions to redeem.");
            return;
        }

        const indexSets = winningPositions.map(pos => pos.indexSet);
        console.log(`Redeeming index sets: [${indexSets.join(', ')}]...`);

        // 2. Encode the redemption function call
        const data = ctfInterface.encodeFunctionData("redeemPositions", [
            USDCe_ADDRESS,
            ethers.constants.HashZero,
            conditionId,
            indexSets
        ]);

        // 3. Execute via Safe (SIMPLIFIED from the working code)
        console.log("Executing redemption via Safe...");

        const safeSdk = await Safe.init({
            provider: RPC_URL,
            signer: POLYMARKET_PRIVATE_KEY,
            safeAddress: PROXY_WALLET_ADDRESS,
        });

        const safeTransaction = await safeSdk.createTransaction({
            transactions: [{
                to: CTF_ADDRESS,
                value: "0",
                data: data,
                operation: OperationType.Call,
            }]
        });

        const signedTx = await safeSdk.signTransaction(safeTransaction);
        const result = await safeSdk.executeTransaction(signedTx);

        console.log("Transaction sent:", result.hash);

        // Wait for confirmation
        const receipt = await provider.waitForTransaction(result.hash);
        console.log("Transaction confirmed in block:", receipt.blockNumber);
        console.log("✅ Redemption successful!");
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}