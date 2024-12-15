const { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { StargateClient } = require("@cosmjs/stargate");

const rpc = "https://rpc-beta1.turablockchain.com";


  const runAll = async () => {
    const client = await StargateClient.connect(rpc);
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight());
    console.log(
      "Alice balances:",
      await client.getAllBalances("tura1qftsp7fww30rf8taq0yhkkr2y09m8py4fqrhqu")
    );
  }

runAll().catch(console.error);
const queryTransactions = async (address) => {
  const client = await StargateClient.connect(rpc);
  const result = await client.getTxsEvent(`message.sender='${address}'`);
  return result;
};

queryTransactions("tura1qftsp7fww30rf8taq0yhkkr2y09m8py4fqrhqu")
  .then((txs) => console.log("Transaction history:", txs))
  .catch(console.error);