require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { connectToDatabase, disconnectFromDatabase } = require("./db");


// 从 .env 文件加载配置
const TOKEN = process.env.TagfusionBotToken;

// 初始化客户端
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,         // 访问服务器信息
    GatewayIntentBits.GuildMessages, // 监听服务器消息
    GatewayIntentBits.MessageContent, // 读取消息内容
    GatewayIntentBits.GuildMembers,  // 读取成员
  ],
});

async function run() {
  const client = await connectToDatabase();
  
}

run().catch((err) => console.error("Error running example:", err));

async function createTuraWallet() {
  try {
    console.log("[INFO] Generating new Tura wallet...");
    const wallet = await DirectSecp256k1HdWallet.generate(24, { prefix: "tura" });
    const [account] = await wallet.getAccounts();
    console.log("[SUCCESS] Wallet generated successfully.");
    console.log(`[DEBUG] Address: ${account.address}`);
    return {
      address: account.address,
      mnemonic: wallet.mnemonic,
    };
  } catch (error) {
    console.error("[ERROR] Failed to generate wallet:", error);
    throw new Error("Failed to generate wallet");
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "register-wallet") {
    console.log(`[INFO] Handling command: /register-wallet from user ${interaction.user.tag}`);
    try {
      // 生成钱包
      const wallet = await createTuraWallet();

      // 私信用户
      try {
        console.log(`[INFO] Sending wallet details to user ${interaction.user.tag}...`);
        await interaction.user.send(
          `🎉 **Your Tura Wallet is ready!**\n\n**Address:** \`${wallet.address}\`\n**Mnemonic:** \`${wallet.mnemonic}\`\n\n⚠️ **Please save this mnemonic securely! Do not share it with anyone.**`
        );
        console.log(`[SUCCESS] Wallet details sent to user ${interaction.user.tag} successfully.`);
        await interaction.reply({
          content: "Your wallet has been created! Check your DM for details.",
          ephemeral: true,
        });
      } catch (dmError) {
        console.error("[ERROR] Failed to send DM to user:", dmError);
        await interaction.reply({
          content: "Failed to send you a DM. Please check your DM settings and try again.",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("[ERROR] Failed to handle /register-wallet command:", error);
      await interaction.reply({
        content: "An error occurred while generating your wallet. Please try again later.",
        ephemeral: true,
      });
    }
  }
});

// 登录机器人
client.login(TOKEN).then(() => {
  console.log("[INFO] Bot logged in successfully.");
}).catch((loginError) => {
  console.error("[ERROR] Failed to log in the bot:", loginError);
});
