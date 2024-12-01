require("dotenv").config();
const { REST, Routes } = require("discord.js");

// 定义 Slash Commands
const commands = [

  {
    name: "verifytura",
    description: "Check if the user is connected to Tura",
  },
  
  {
    name: "register-wallet",
    description: "Register a new tura wallet",
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
    // 修复错误输出
    console.error(`There was an error: ${error}`);
  }
})();
