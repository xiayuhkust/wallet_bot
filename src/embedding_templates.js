const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

/**
 * 创建首次使用钱包的主界面 Embedding 模板
 */
function getWalletWelcomeTemplate(userName) {
  // 构建嵌入内容
  const embed = new EmbedBuilder()
    .setColor(0x00ff00) // 设置主题颜色
    .setTitle("🌟 Welcome to TagFusion Wallet")
    .setDescription(
      `Hello **${userName}**! Welcome to your personal wallet interface.\n\n` +
      `Here, you can securely manage your Tura Wallet. Since this is your first time, please choose one of the following options to get started:\n\n` +
      `🔹 **Create a Wallet**: Generate a new wallet with a fresh address and mnemonic.\n` +
      `🔹 **Restore a Wallet**: Import an existing wallet using your mnemonic phrase.\n\n` +
      `Click one of the buttons below to proceed!`
    )
    .setFooter({ text: "Your wallet. Your control. Let's get started!" })
    .setTimestamp();

  // 构建按钮
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("create_wallet")
      .setLabel("Create Wallet") // 按钮文本
      .setStyle(ButtonStyle.Success), // 成功样式（绿色）
    new ButtonBuilder()
      .setCustomId("restore_wallet")
      .setLabel("Restore Wallet")
      .setStyle(ButtonStyle.Primary) // 主要样式（蓝色）
  );

  return { embed, buttons };
}

/**
 * 创建钱包主页面 Embedding 模板
 */
function getWalletMainTemplate(userName, turaAddress, turaBalance, tagsBalance) {
  // 构建嵌入内容
  const embed = new EmbedBuilder()
    .setColor(0x1e90ff) // 设置主题颜色
    .setTitle(`💼 ${userName}'s TagFusion Wallet`)
    .setDescription(
      `🔹 **Tura Address**: \`${turaAddress}\`\n` +
      `🔹 **Tura Balance**: \`${turaBalance} TURA\`\n` +
      `🔹 **Tags Balance**: \`${tagsBalance} TAGS\`\n\n` +
      `This is your AI-powered wallet. You can ask it about any business or just have a casual chat!`
      + `\n\nClick the **Daily Rewards** button to claim your Tura and start using our services!`
    )
    .setFooter({ text: "Your wallet. Your control. Manage wisely!" })
    .setTimestamp();

  // 构建按钮
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("Daily_Rewards")
      .setLabel("Daily Rewards") // 按钮文本
      .setStyle(ButtonStyle.Primary), // 主要样式（蓝色）
  );

  return { embed, buttons };
}

/**
 * 创建查看 Tag 的 Embedding 模板,假设可以得到一个Json列表
 */
function getTagsViewTemplate(tagsJson) {
  // 构建嵌入内容
  const embed = new EmbedBuilder()
    .setColor(0xffa500) // 设置主题颜色
    .setTitle("🔖 TagFusion Tags Overview")
    .setDescription("Here are the tags categorized for your convenience:");

  // 遍历每个类型并添加到嵌入内容中
  for (const category in tagsJson) {
    if (tagsJson.hasOwnProperty(category)) {
      const tags = tagsJson[category].join(", ");
      embed.addFields({ name: `**${category}**`, value: tags });
    }
  }

  embed.setFooter({ text: "Explore and manage your tags efficiently!" }).setTimestamp();

  return { embed };
}

module.exports = {
  getWalletWelcomeTemplate,
  getWalletMainTemplate,
  getTagsViewTemplate,
};

