const { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { StargateClient } = require("@cosmjs/stargate");
const { getFaucet,sendFaucet } = require("./Faucet");


const turaAddress = "tura1qftsp7fww30rf8taq0yhkkr2y09m8py4fqrhqu";
const userId = "867058606289453076";

async function main() {
  const faucet = await getFaucet(turaAddress);
  console.log(faucet);
}

main().catch(console.error);