require('dotenv').config();
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { StargateClient, SigningStargateClient } = require("@cosmjs/stargate");

const privatekey = "2a71ecb8fbb31eacf0dd0321c9bb6b3e34b3dc48d0362324c2f91e751c891a2a"

const rpc = process.env.RPC_URL; // 使用测试网的 RPC URL

const getSignerFromMnemonic = async (mnemonic) => {
    return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "tura",
    });
};

const runAll = async () => {
    try {
        const client = await StargateClient.connect(rpc);
        console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight());

        // 使用您提供的助记词
        const mnemonic = "position oak sadness novel monitor ridge link gasp drill convince want slam define office remind when cherry betray lab increase warm surround riot suffer";
        const signer = await getSignerFromMnemonic(mnemonic);
        const account = (await signer.getAccounts())[0].address;
        console.log("Account's address from signer", account);

        console.log(
            "Account balances:",
            await client.getAllBalances(account)
        );
    } catch (error) {
        console.error("Error:", error);
    }
};

runAll();