require("dotenv").config();
const { REST, Routes } = require("discord.js");

// 定义 Slash Commands
const commands = [
  {
    name: "wallet",
    description: "Access your Tura wallet functions",
  },
  {
    name: "pw",
    description: "Set your wallet password.",
    options: [
      {
        name: "password",
        type: 3, // STRING
        description: "Your wallet password.",
        required: true,
      },
    ],
  },
  {
    name: "change-pw",
    description: "Change your wallet password.",
    options: [
      {
        name: "old_pw",
        type: 3, // STRING
        description: "Your current wallet password.",
        required: true,
      },
      {
        name: "new_pw",
        type: 3, // STRING
        description: "Your new wallet password.",
        required: true,
      },
    ],
  },
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
