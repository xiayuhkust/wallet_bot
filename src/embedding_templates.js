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

module.exports = {
  getWalletWelcomeTemplate,
};
