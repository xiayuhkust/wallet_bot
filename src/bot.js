require("dotenv").config();
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require("discord.js");
const { connectToDatabase, getClient } = require("./db");
const { handlePrivateChannelMessage } = require("./private_channel_service"); // 引入服务逻辑
const { getWalletWelcomeTemplate } = require("./embedding_templates");
const { registerNewWallet } = require("./walletController"); // 假设 wallet.js 处理钱包逻辑
const { checkWallet } = require("../models/wallet");

// 从 .env 文件加载配置
const TOKEN = process.env.TagfusionBotToken;

// 初始化客户端
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// 初始化数据库并启动机器人
(async () => {
  try {
    console.log("[INFO] Initializing database connection...");
    await connectToDatabase();

    // 测试数据库连接
    const dbClient = getClient(); // 获取数据库客户端实例
    const testResult = await dbClient.query("SELECT NOW() AS current_time");
    console.log(`[INFO] Database connection successful. Current time: ${testResult.rows[0].current_time}`);

    console.log("[INFO] Starting bot login...");
    await client.login(TOKEN); // 这里的 client 是 Discord 客户端
    console.log("[INFO] Bot logged in successfully.");
  } catch (error) {
    console.error("[ERROR] Failed to initialize bot or database:", error);
    process.exit(1); // 如果初始化失败，则退出进程
  }
})();

// 创建一个 Map 用于存储用户和他们的私密频道信息
const userChannels = new Map();
const activityTimeouts = new Map(); // Store activity timeouts per user
// 确保 FrontDesk 类别存在
async function ensureFrontDeskCategory(guild) {
  const categoryName = "FrontDesk";

  const existingCategory = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );

  if (existingCategory) {
    return existingCategory;
  }

  // 创建 FrontDesk 类别
  const newCategory = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
  });

  console.log(`[INFO] Created FrontDesk category.`);
  return newCategory;
}
//消息是否来自私密频道
function isMessageFromValidChannel(userId, channelId) {
  const userChannelId = userChannels.get(userId);
  return userChannelId === channelId;
}

// Reset the activity timeout for the user
function resetActivityTimeout(userId, privateChannel) {
  // Clear the previous timeout if any
  clearTimeout(activityTimeouts.get(userId));

  // Set a new timeout
  const timeout = setTimeout(async () => {
    try {
      if (userChannels.has(userId)) {
        await privateChannel.delete();
        userChannels.delete(userId);
        console.log(`[INFO] Deleted inactive channel: ${privateChannel.name}`);
      }
    } catch (error) {
      console.error(`[ERROR] Failed to delete inactive channel: ${error.message}`);
    }
  }, 5 * 60 * 1000); // 5 minutes of inactivity

  // Store the new timeout
  activityTimeouts.set(userId, timeout);
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
      // 检查是否在私密频道中
    const userId = interaction.user.id;
    const channelId = interaction.channel.id;
    // If user has a private channel, reset the activity timeout
    if (userChannels.has(userId) && userChannels.get(userId) === channelId) {
      const privateChannel = interaction.guild.channels.cache.get(channelId);
      resetActivityTimeout(userId, privateChannel); // Reset activity timeout
    }
    if (interaction.commandName === "wallet") {
      console.log(`[INFO] Handling command: /wallet from user ${interaction.user.tag}`);
      const guild = interaction.guild;
      const user = interaction.user;
  
      if (!guild) {
        await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
        return;
      }
  
      // 检查是否已有频道存在
      if (userChannels.has(user.id)) {
        const existingChannelId = userChannels.get(user.id);
        const existingChannel = guild.channels.cache.get(existingChannelId);
        if (existingChannel) {
          await interaction.reply({
            content: `You already have a private channel: <#${existingChannel.id}>`,
            ephemeral: true,
          });
          return;
        } else {
          userChannels.delete(user.id); // 清理无效的映射
        }
      }
  
      try {
        // 确保 FrontDesk 类别存在
        const category = await ensureFrontDeskCategory(guild);
  
        // 检查类别下的频道数量
        const channelsInCategory = guild.channels.cache.filter(
          (channel) => channel.parentId === category.id && channel.type === ChannelType.GuildText
        );
  
        if (channelsInCategory.size >= 200) {
          await interaction.reply({
            content: "The system is busy. Please try again later.",
            ephemeral: true,
          });
          return;
        }
  
        // 创建私密频道
        const channelName = `wallet-${user.username}`;
        const privateChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id, // 将频道放入 FrontDesk 类别下
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id, // 禁止所有用户查看
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: user.id, // 允许目标用户查看和发送消息
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
            {
              id: guild.members.me.id, // 允许机器人访问
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageChannels,
              ],
            },
          ],
        });
  
        // 保存用户频道映射
        userChannels.set(user.id, privateChannel.id);
        // 回复用户并提供私密频道链接
        await interaction.reply({
          content: `Your private channel has been created successfully! You can access it here: <#${privateChannel.id}>`,
          ephemeral: true,
        });

        // Send wallet welcome template
        const { embed, buttons } = getWalletWelcomeTemplate(user.username);
        await privateChannel.send({
          embeds: [embed],
          components: [buttons],
        });

        console.log(`[INFO] Sent wallet welcome embed to channel: ${privateChannel.name}`);

        // Reset activity timeout for the private channel
        resetActivityTimeout(user.id, privateChannel);

        // Monitor messages for inactivity (5-minute timeout)
        const collector = privateChannel.createMessageCollector({ time: 5 * 60 * 1000 });
        collector.on("collect", (message) => {
          if (message.author.id === user.id) {
            resetActivityTimeout(user.id, privateChannel); // Reset timeout on message activity
          }
        });

        collector.on("end", () => {
          console.log(`[INFO] Stopped monitoring activity for channel: ${privateChannel.name}`);
        });
      } catch (error) {
        console.error("[ERROR] Failed to create private channel:", error);
        await interaction.reply({
          content: "An error occurred while creating your private channel. Please try again later.",
          ephemeral: true,
        });
      }
    }
    else if (interaction.commandName === "pw") {
      const userId = interaction.user.id;
      const channelId = interaction.channel.id;
    
      // 检查是否在用户的私密频道中
      if (!userChannels.has(userId) || userChannels.get(userId) !== channelId) {
        await interaction.reply({
          content: "This command can only be used in your private channel.",
          ephemeral: true,
        });
        return;
      }
    
      // 检查用户是否已有钱包
      const existingWallet = await checkWallet(userId);
      if (existingWallet) {
        await interaction.reply({
          content: "You already have a wallet. Use `/change-pw` to update your password.",
          ephemeral: true,
        });
        return;
      }
    
      // 获取用户输入的密码
      const password = interaction.options.getString("password");
    
      // 验证密码强度
      if (password.length < 6) {
        await interaction.reply({
          content: "Your password must be at least 6 characters long. Please try again.",
          ephemeral: true,
        });
        return;
      }
    
      // 将密码传递到创建钱包逻辑
      try {
        const wallet = await registerNewWallet(interaction.user.id, interaction.user.username, password);
    
        // 向私密频道发送钱包信息，并告知用户保存
        const replyMessage = await interaction.reply({
          content:
            `🎉 **Your Tura Wallet has been created!**\n\n` +
            `**Address:** \`${wallet.address}\`\n` +
            `⚠️ **Please save this address and your private key securely!**\n\n` +
            `This message will be deleted in 3 minutes.`,
          ephemeral: false, // 使消息对用户可见并需要手动处理
        });
    
        // 设置 3 分钟后自动删除消息
        setTimeout(async () => {
          try {
            await replyMessage.delete();
            console.log(`[INFO] Deleted wallet information message for ${interaction.user.tag}`);
          } catch (error) {
            console.error(`[ERROR] Failed to delete wallet information message: ${error.message}`);
          }
        }, 3 * 60 * 1000);
    
        console.log(`[SUCCESS] Wallet details sent to ${interaction.user.tag}`);
      } catch (error) {
        console.error(`[ERROR] Failed to create wallet: ${error.message}`);
        await interaction.reply({
          content: "An error occurred while creating your wallet. Please try again later.",
          ephemeral: true,
        });
      }
    }
    
    else if (interaction.isCommand() && interaction.commandName === "change-pw") {
      const oldPassword = interaction.options.getString("old_pw");
      const newPassword = interaction.options.getString("new_pw");
    
      // 验证密码并更新钱包逻辑
      // ...
    }
  } else if (interaction.isButton()){
      // 获取当前用户和频道信息
      const userId = interaction.user.id;
      const channelId = interaction.channel.id;

      // 验证按钮交互是否在用户的私密频道中
      if (!userChannels.has(userId) || userChannels.get(userId) !== channelId) {
        await interaction.reply({
          content: "You are not authorized to interact in this channel.",
          ephemeral: true, // 仅对当前用户显示
        });
        return; // 停止进一步处理
      }

      if (interaction.customId === "create_wallet") {
        console.log(`[INFO] User ${interaction.user.tag} clicked Create Wallet`);
      
        await interaction.reply({
          content:
            "To create your wallet, please use the `/pw` command followed by your desired password. Your password will be used to secure your wallet. Example:\n\n`/pw mySecurePassword123`",
          ephemeral: true,
        });
      }

      else if (interaction.commandName === "change-pw") {
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;
      
        // 验证命令是否在用户的私密频道中
        if (!userChannels.has(userId) || userChannels.get(userId) !== channelId) {
          await interaction.reply({
            content: "This command can only be used in your private channel.",
            ephemeral: true,
          });
          return;
        }
      
        // 获取用户输入的旧密码和新密码
        const oldPassword = interaction.options.getString("old_pw");
        const newPassword = interaction.options.getString("new_pw");
      
        // 验证新密码强度
        if (newPassword.length < 6) {
          await interaction.reply({
            content: "Your new password must be at least 6 characters long. Please try again.",
            ephemeral: true,
          });
          return;
        }
      
        try {
          // 获取用户的钱包信息
          const wallet = await checkWallet(userId);
          if (!wallet) {
            await interaction.reply({
              content: "No wallet found for your account. Please create one first.",
              ephemeral: true,
            });
            return;
          }
      
          // 解密助记词以验证旧密码
          let mnemonic;
          try {
            mnemonic = decryptData(wallet.encrypted_key, oldPassword);
          } catch (error) {
            await interaction.reply({
              content: "Your current password is incorrect. Please try again.",
              ephemeral: true,
            });
            return;
          }
      
          // 用新密码重新加密助记词
          const newEncryptedKey = encryptData(mnemonic, newPassword);
      
          // 更新数据库中的加密助记词
          await updateWalletKey(userId, newEncryptedKey);
      
          await interaction.reply({
            content: "Your wallet password has been updated successfully!",
            ephemeral: true,
          });
          console.log(`[INFO] User ${interaction.user.tag} updated their wallet password.`);
        } catch (error) {
          console.error(`[ERROR] Failed to update password for user ${interaction.user.tag}:`, error);
          await interaction.reply({
            content: "An error occurred while updating your password. Please try again later.",
            ephemeral: true,
          });
        }
      }      

  }
});

/*
// 监听私密频道中的消息
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  // 验证消息是否来自有效的私密频道
  if (!isMessageFromValidChannel(message.author.id, message.channel.id)) {
    return; // 忽略其他频道的消息
  }
  handlePrivateChannelMessage(message); // 委托给服务文件
});
*/
// 登录机器人
client.login(TOKEN).then(() => {
  console.log("[INFO] Bot logged in successfully.");
}).catch((loginError) => {
  console.error("[ERROR] Failed to log in the bot:", loginError);
});
