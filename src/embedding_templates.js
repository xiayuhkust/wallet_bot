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
    .setTitle("💼 Your TagFusion Wallet")
    .setDescription(
      `Hello **${userName}**! Here is the overview of your wallet:\n\n` +
      `🔹 **Tura Address**: \`${turaAddress}\`\n` +
      `🔹 **Tura Balance**: \`${turaBalance} TURA\`\n` +
      `🔹 **Tags Balance**: \`${tagsBalance} TAGS\`\n\n` +
      `Use the buttons below to manage your wallet.`
    )
    .setFooter({ text: "Your wallet. Your control. Manage wisely!" })
    .setTimestamp();

  // 构建按钮
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("send_tura")
      .setLabel("Send Tura")
      .setStyle(ButtonStyle.Primary), // 主要样式（蓝色）
    new ButtonBuilder()
      .setCustomId("receive_tura")
      .setLabel("Receive Tura")
      .setStyle(ButtonStyle.Success), // 成功样式（绿色）
    new ButtonBuilder()
      .setCustomId("view_transactions")
      .setLabel("View Transactions")
      .setStyle(ButtonStyle.Secondary) // 次要样式（灰色）
  );

  return { embed, buttons };
}

module.exports = {
  getWalletWelcomeTemplate,
  getWalletMainTemplate,
};

