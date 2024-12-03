const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { createWallet, checkWallet } = require("../models/wallet");
const { encryptData } = require("./crypto_utils"); // 引入加密工具

/**
 * 注册新钱包
 * @param {string} discordId Discord 用户 ID
 * @param {string} username 用户名
 * @param {string} password 用户设置的密码
 * @returns {Promise<Object>} 包含钱包地址（不包含助记词）
 */
async function registerNewWallet(discordId, username, password) {
  console.log(`[INFO] Generating new wallet for ${username}...`);

  // 检查用户是否已有钱包
  const existingWallet = await checkWallet(discordId);
  if (existingWallet) {
    console.log(`[INFO] Wallet already exists for user ${username}`);
    throw new Error("A wallet already exists for this user.");
  }

  // 生成新的钱包
  const wallet = await DirectSecp256k1HdWallet.generate(24, { prefix: "tura" });
  const [account] = await wallet.getAccounts();

  // 加密助记词
  const encryptedMnemonic = encryptData(wallet.mnemonic, password);

  // 将新钱包保存到数据库
  const savedWallet = await createWallet(discordId, account.address, encryptedMnemonic);

  console.log(`[SUCCESS] Wallet registered for user ${username}`);
  return {
    address: savedWallet.address,
    message: "Your wallet has been created. Remember to save your mnemonic securely."
  };
}

module.exports = { registerNewWallet };
