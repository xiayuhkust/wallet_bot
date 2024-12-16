require("dotenv").config();
const { REST, Routes } = require("discord.js");

// 定义 Slash Commands
const commands = [
  {
    name: "wallet",
    description: "Access your Tura wallet functions",
  },
  {
    name: "restore_wallet",
    description: "Restore your wallet using a private key or mnemonic",
    options: [
      {
        type: 3, // STRING type
        name: "privatekey",
        description: "Your wallet's private key",
        required: false,
      },
      {
        type: 3, // STRING type
        name: "mnemonic",
        description: "Your wallet's mnemonic",
        required: false,
      },
    ],
  },
  {
    name: "wallet_main",
    description: "View the main page of your wallet",
  }
];

// 创建 REST 客户端
const rest = new REST({ version: "10" }).setToken(process.env.TagfusionBotToken);

(async () => {
  try {
    console.log("Registering slash commands...");

    // 将命令注册到指定的服务器
    await rest.put(
      Routes.applicationGuildCommands(process.env.Client_ID, process.env.Guild_ID),
      { body: commands }
    );

    console.log("Slash commands successfully registered!");
  } catch (error) {
    console.error(`There was an error: ${error}`);
  }
})();
