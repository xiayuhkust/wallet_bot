const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { StargateClient, SigningStargateClient } = require("@cosmjs/stargate");
const{getSignerFromUser} = require("./walletController");

async function getFaucetSigner() {
    const faucetMnemonic = process.env.FAUCET_MNEMONIC;
    if (!faucetMnemonic) {
        throw new Error("Faucet mnemonic not found in environment variables.");
    }
    return DirectSecp256k1HdWallet.fromMnemonic(faucetMnemonic, { prefix: "tura" });
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function getFaucet(targetTuraAddress) {
    const rpc = process.env.RPC_URL; // Replace with your RPC endpoint
    const client = await StargateClient.connect(rpc);
    const faucetSigner = await getFaucetSigner();
    const faucetAddress = (await faucetSigner.getAccounts())[0].address;

    const faucetBalance = await client.getAllBalances(faucetAddress);
    const transferAmount = { denom: "utura", amount: "10000000" }; // 0.1tura

    if (parseInt(faucetBalance.find(b => b.denom === "utura")?.amount || "0") < parseInt(transferAmount.amount)) {
        throw new Error("Insufficient balance in faucet.");
    }

    const signingClient = await SigningStargateClient.connectWithSigner(rpc, faucetSigner);
    const result = await signingClient.sendTokens(faucetAddress, targetTuraAddress, [transferAmount], {
        amount: [{ denom: "utura", amount: "3000" }],
        gas: "200000",
    });

    if (result.code !== undefined && result.code !== 0) {
        throw new Error(`Failed to send tokens: ${result.log || result.rawLog}`);
    }

    return result;
}

async function sendFaucet(userID) {
    const rpc = process.env.RPC_URL; // Replace with your RPC endpoint
    const client = await StargateClient.connect(rpc);
    const faucetSigner = await getFaucetSigner();
    const faucetAddress = (await faucetSigner.getAccounts())[0].address;

    const userSigner = await getSignerFromUser(userID); // Get the user's signer using the provided function
    const userAddress = (await userSigner.getAccounts())[0].address;
    const paymentAmount = { denom: "utura", amount: "500000" }; // 0.005tura

    const signingClient = await SigningStargateClient.connectWithSigner(rpc, userSigner);
    const result = await signingClient.sendTokens(userAddress, faucetAddress, [paymentAmount], {
        amount: [{ denom: "utura", amount: "3000" }],
        gas: "200000",
    });

    if (result.code !== undefined && result.code !== 0) {
        throw new Error(`Failed to send tokens: ${result.log || result.rawLog}`);
    }

    return result;
}

module.exports = {
    getFaucet,
    sendFaucet,
};