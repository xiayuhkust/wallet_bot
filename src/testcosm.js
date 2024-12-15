require('dotenv').config();
const { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { StargateClient } = require("@cosmjs/stargate");

const privatekey = "2a71ecb8fbb31eacf0dd0321c9bb6b3e34b3dc48d0362324c2f91e751c891a2a";
const mnemonic = "position oak sadness novel monitor ridge link gasp drill convince want slam define office remind when cherry betray lab increase warm surround riot suffer";

const getSignerFromMnemonic = async (mnemonic) => {
    return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "tura",
    });
};

const getSignerFromPrivateKey = async (privateKey) => {
    return DirectSecp256k1Wallet.fromKey(Buffer.from(privateKey, "hex"), "tura");
};
const rpc = process.env.RPC_URL; // 使用测试网的 RPC URL



const runAll = async () => {
    try {
        const client = await StargateClient.connect(rpc);
        console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight());

        // 使用助记词生成 signer 并获取余额
        const mnemonicSigner = await getSignerFromMnemonic(mnemonic);
        const mnemonicAccount = (await mnemonicSigner.getAccounts())[0].address;
        console.log("Account's address from mnemonic signer", mnemonicAccount);
        console.log(
            "Account balances from mnemonic:",
            await client.getAllBalances(mnemonicAccount)
        );

        // 使用私钥生成 signer 并获取余额
        const privateKeySigner = await getSignerFromPrivateKey(privatekey);
        const privateKeyAccount = (await privateKeySigner.getAccounts())[0].address;
        console.log("Account's address from private key signer", privateKeyAccount);
        console.log(
            "Account balances from private key:",
            await client.getAllBalances(privateKeyAccount)
        );
    } catch (error) {
        console.error("Error:", error);
    }
};

runAll();