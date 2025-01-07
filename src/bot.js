require("dotenv").config();
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require("discord.js");
const { connectToDatabase, getClient } = require("./db");
const { handlePrivateChannelMessage } = require("./private_channel_service"); // 引入服务逻辑
const { getWalletWelcomeTemplate,getWalletMainTemplate,getTagsViewTemplate } = require("./embedding_templates");
const { registerNewWallet,  restoreWallet_Mnemonic,  restoreWallet_PrivateKey, getBalances } = require("./walletController"); // 假设 wallet.js 处理钱包逻辑
const { checkWallet,recordFaucetClaim ,checkFaucetClaim} = require("../models/wallet");
const { getFaucet,sendFaucet } = require("./Faucet");
const { filterManager,processUserMessage_generalagent} = require("./chatgpt");
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
// 创建两个常数用于暂存用户的 cosmos 地址和 tura 地址
const userCosmosAddresses = new Map();
const userTuraAddresses = new Map();

async function updateUserWalletAddresses(userId) {
  try {
    const wallet = await checkWallet(userId);
    if (wallet && wallet.cosmospublickey && wallet.turapublickey) {
      userCosmosAddresses.set(userId, wallet.cosmospublickey);
      userTuraAddresses.set(userId, wallet.turapublickey);
      console.log(`[INFO] Updated wallet addresses for user ${userId}`);
      console.log(`[DEBUG] Cosmos Address: ${wallet.cosmospublickey}, Tura Address: ${wallet.turapublickey}`);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`[ERROR] Failed to update wallet addresses for user ${userId}: ${error.message}`);
    return false;
  }
}

async function cleanupFrontDeskChannels(guild) {
  try {
    const categoryName = "FrontDesk";
    const category = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
    );

    if (!category) {
      console.log("[INFO] No FrontDesk category found for cleanup.");
      return;
    }

    const channelsInCategory = guild.channels.cache.filter(
      (channel) => channel.parentId === category.id && channel.type === ChannelType.GuildText
    );

    for (const [channelId, channel] of channelsInCategory) {
      await channel.delete();
      console.log(`[INFO] Deleted channel: ${channel.name}`);
    }

    console.log("[INFO] Cleanup of FrontDesk channels completed.");
  } catch (error) {
    console.error("[ERROR] Failed to cleanup FrontDesk channels:", error);
  }
}

process.on("exit", async () => {
    const guild = client.guilds.cache.first(); // Assuming the bot is in only one guild
  if (guild) {
    await cleanupFrontDeskChannels(guild);
  }
});

process.on("SIGINT", async () => {
  process.exit();
});

process.on("SIGTERM", async () => {
  process.exit();
});
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

function convertBalances(balances) {
  let turaBalance = 0;
  let tagsBalance = 0;

  balances.forEach((balance) => {
    if (balance.denom === 'utura') {
      turaBalance = parseFloat(balance.amount) / 100000000;
    } else if (balance.denom === 'utags') {
      tagsBalance = parseFloat(balance.amount) / 100000;
    }
  });

  return { turaBalance, tagsBalance };
}
//消息是否来自私密频道
function isMessageFromValidChannel(userId, channelId) {
  const userChannelId = userChannels.get(userId);
  return userChannelId === channelId;
}

async function sendWalletMainTemplate(userId, privateChannel) {
  const turaAddress = userTuraAddresses.get(userId);
  console.log(`[INFO] Tura Address for user ${userId}: ${turaAddress}`);

  const balances = await getBalances(turaAddress);


  const { turaBalance, tagsBalance } = convertBalances(balances);
  const { embed, buttons } = getWalletMainTemplate(userId, turaAddress, turaBalance, tagsBalance);
  await privateChannel.send({
    embeds: [embed],
    components: [buttons],
  });
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
        const walletUpdated = await updateUserWalletAddresses(user.id);
        if (!walletUpdated) {
          const { embed, buttons } = getWalletWelcomeTemplate(user.username);
          await privateChannel.send({
            embeds: [embed],
            components: [buttons],
          });
        } else {
            await sendWalletMainTemplate(user.id, privateChannel);
        }

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
    else if (interaction.commandName === "wallet_main") {
      // 获取当前用户和频道信息
      const userId = interaction.user.id;
      const channelId = interaction.channel.id;

      // 验证命令是否在用户的私密频道中
      if (!userChannels.has(userId) || userChannels.get(userId) !== channelId) {
        return; // 停止进一步处理
      }

      console.log(`[INFO] Handling command: /wallet_main from user ${interaction.user.tag}`);

      try {
        const privateChannel = interaction.guild.channels.cache.get(channelId);
        await sendWalletMainTemplate(userId, privateChannel);
        await interaction.reply({
          content: "Your wallet main interface has been updated.",
          ephemeral: true,
        });
      } catch (error) {
        console.error(`[ERROR] Failed to send wallet main template: ${error.message}`);
        await interaction.reply({
          content: "An error occurred while updating your wallet main interface. Please try again later.",
          ephemeral: true,
        });
      }
    }
    else if (interaction.commandName === "restore_wallet") {
        // 获取当前用户和频道信息
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;
      // 验证按钮交互是否在用户的私密频道中
      if (!userChannels.has(userId) || userChannels.get(userId) !== channelId) {
        return; // 停止进一步处理
      }
      console.log(`[INFO] Handling command: /restore_wallet from user ${interaction.user.tag}`);

      const privateKey = interaction.options.getString("privatekey");
      const mnemonic = interaction.options.getString("mnemonic");

      if (!privateKey && !mnemonic) {
      await interaction.reply({
        content: "You must provide either a private key or a mnemonic to restore your wallet.",
        ephemeral: true,
      });
      return;
      }

      try {
      let wallet;
      if (privateKey) {
        wallet = await restoreWallet_PrivateKey(userId, privateKey);
      } else if (mnemonic) {
        wallet = await restoreWallet_Mnemonic(userId, mnemonic);
      }

      await interaction.reply({
        content:
        `🎉 **Your Tura Wallet has been restored!**\n\n` +
        `**Cosmos Address:** \`${wallet.cosmosAddress}\`\n` +
        `**Tura Address:** \`${wallet.turaAddress}\`\n\n` +
        `You can view your wallet main interface by typing \`/wallet_main\`.`,
        ephemeral: true,
      });
      console.log(`[SUCCESS] Wallet restored for ${interaction.user.tag}`);
      } catch (error) {
      console.error(`[ERROR] Failed to restore wallet: ${error.message}`);
      await interaction.reply({
        content: "An error occurred while restoring your wallet. Please try again later.",
        ephemeral: true,
      });
      }
    }
  } 
  // 处理按钮交互
   if (interaction.isButton()) {
    // 获取当前用户和频道信息
    const userId = interaction.user.id;
    const channelId = interaction.channel.id;
    
    // 验证按钮交互是否在用户的私密频道中
    if (!userChannels.has(userId) || userChannels.get(userId) !== channelId) {
      return; // 停止进一步处理
    }
    
    if (interaction.customId === "create_wallet") {
      console.log(`[INFO] User ${interaction.user.tag} clicked Create Wallet`);
    
      // 检查用户是否已有钱包
      const walletUpdated = await updateUserWalletAddresses(userId);
      if (walletUpdated) {
      await interaction.reply({
        content: "You already have a wallet. You can change your wallet by clicking Redirect.",
        ephemeral: true,
      });
      return;
      }
      // 创建钱包并向用户反馈
      try {
      const wallet = await registerNewWallet(interaction.user.id);
    
      // 构建反馈信息
      const replyMessage = await interaction.reply({
        content:
        `🎉 **Your Tura Wallet has been created!**\n\n` +
        `**Cosmos Address:** \`${wallet.cosmosAddress}\`\n` +
        `**Tura Address:** \`${wallet.turaAddress}\`\n\n` +
        `🔑 **Important:** Below is your mnemonic (seed phrase). This is the only way to recover your wallet if you lose access.\n\n` +
        `**Mnemonic:** \`${wallet.mnemonic}\`\n\n` +
        `⚠️ **Please save your mnemonic securely. Do NOT share it with anyone.**\n` +
        `This message will not be saved and will be deleted in 3 minutes for security reasons. Make sure to manually delete this message after saving.\n` +
        `You can view your wallet main interface by typing \`/wallet_main\`.`,
        ephemeral: true, // 确保消息仅对用户可见
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
    else if (interaction.customId === "restore_wallet") {
      console.log(`[INFO] User ${interaction.user.tag} clicked Restore Wallet`);
      await interaction.reply({
      content: 'To restore your wallet, please use the command `/restore_wallet`.',
      ephemeral: true,
      });
    }

    else if (interaction.customId === "Daily_Rewards") {
      console.log(`[INFO] User ${interaction.user.tag} clicked Daily Rewards`);

      console.log(`[INFO] User ${interaction.user.tag} clicked Daily Rewards - Start`);

      try {
      const userId = interaction.user.id;

      console.log(`[INFO] Checking faucet claim for user ${userId}`);
      // Check if the user has already claimed the faucet within the last 24 hours
      const hasClaimed = await checkFaucetClaim(userId);
      if (hasClaimed) {
        console.log(`[INFO] User ${userId} has already claimed daily rewards`);
        await interaction.reply({
        content: "You have already claimed your daily rewards. Please try again after 24 hours.",
        ephemeral: true,
        });
        return;
      }

      // Inform the user that the daily reward is being processed
      await interaction.reply({
        content: "Your daily rewards are being processed. You will be notified once the process is complete.",
        ephemeral: true,
      });

      // Process the faucet claim in a separate async function
      (async () => {
        try {
        console.log(`[INFO] Getting faucet rewards for user ${userId}`);
        const turaAddress = userTuraAddresses.get(userId);
        const faucetResult = await getFaucet(turaAddress);
        if (faucetResult.code === 0) {
          console.log(`[INFO] Faucet rewards received for user ${userId}`);
          // Record the faucet claim
          await recordFaucetClaim(userId);

            // Notify the user of the successful claim
            const turaAddress = userTuraAddresses.get(userId);
            const balances = await getBalances(turaAddress);
            const { turaBalance, tagsBalance } = convertBalances(balances);

            const rewardAmount = 0.1; // 0.1 TURA
            const newTuraBalance = turaBalance + rewardAmount;

            await interaction.followUp({
            content: `🎉 **Congratulations!** You have received your daily rewards:\n\n` +
              `**Amount:** 0.1 TURA\n\n` +
              `**New TURA Balance:** ${newTuraBalance.toFixed(4)} TURA\n\n` +
              `Come back tomorrow for more rewards!`,
            ephemeral: true,
            });
        } else {
          console.log(`[ERROR] Failed to get faucet rewards for user ${userId}`);
          await interaction.followUp({
          content: "Failed to claim daily rewards. Please try again later.",
          ephemeral: true,
          });
        }
        } catch (error) {
        console.error(`[ERROR] Failed to process daily rewards: ${error.message}`);
        await interaction.followUp({
          content: "An error occurred while processing your daily rewards. Please try again later.",
          ephemeral: true,
        });
        }
      })();

      } catch (error) {
      console.error(`[ERROR] Failed to process daily rewards: ${error.message}`);
      await interaction.reply({
        content: "An error occurred while processing your daily rewards. Please try again later.",
        ephemeral: true,
      });
      }

      console.log(`[INFO] User ${interaction.user.tag} clicked Daily Rewards - End`);
    }
    }
});

// 处理用户消息并分类的主函数
async function handleMessage(message) {
  // 先分类消息
  const topic = await filterManager(message);
  //console.log('Message category:', category);
  // 根据检测到的主题将消息传递给 processUserMessage_generalagent 生成回复
  const response = await processUserMessage_generalagent(message, topic);
  //console.log('Response from General Agent:', response);  // 打印生成的回复
  // 根据分类处理消息
  switch (category) {
      case 'Account Information':
      case 'Transfer Services':
      case 'Account Security and Privacy':
      case 'Claiming Rewards':
      case 'Tag Services':
        const { embed, buttons } = getTagsViewTemplate({
          "Dex": [
            "Uniswap",
            "SushiSwap",
            "PancakeSwap",
            "Curve Finance",
            "1inch",
            "Balancer"
          ],
          "GameFi": [
            "Axie Infinity",
            "The Sandbox",
            "Decentraland",
            "Illuvium",
            "Gods Unchained",
            "Star Atlas"
          ]
        });
        await message.channel.send({
          embeds: [embed],
          components: [buttons],
        });
      case 'Casual Chat':
      default:
        await interaction.reply({
          content: response,
          ephemeral: true,
        });
  }




}

// 监听私密频道中的消息
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  // 验证消息是否来自有效的私密频道
  const userId = message.author.id;
  const channelId = message.channel.id;

  if (!userChannels.has(userId) || userChannels.get(userId) !== channelId) {
    return; // 忽略其他频道的消息以及来
  }
  handleMessage(message); // 委托给服务文件
});

// 登录机器人
client.login(TOKEN).then(() => {
  console.log("[INFO] Bot logged in successfully.");
}).catch((loginError) => {
  console.error("[ERROR] Failed to log in the bot:", loginError);
});
