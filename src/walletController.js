// walletcontroller.js
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const bcrypt = require('bcryptjs');  // 用于密码哈希
const crypto = require('crypto');    // 用于加密私钥和助记词
const { createWallet, checkWallet, updatePassword } = require("../models/wallet");
require('dotenv').config(); // 加载环境变量

/**
 * 加密函数：使用密码和随机盐加密数据
 * @param {string} data 明文数据
 * @param {string} password 用户密码
 * @returns {Object} 加密后的数据及相关参数
 */
function encryptData(data, password) {
  const salt = crypto.randomBytes(16);  // 生成随机盐
  const key = crypto.scryptSync(password, salt, 32);  // 使用 scrypt 算法生成加密密钥
  const iv = crypto.randomBytes(16);  // 初始化向量
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return { encryptedData: encrypted, salt: salt.toString('hex'), iv: iv.toString('hex') };
}

/**
 * 解密函数：使用密码解密数据
 * @param {Object} encryptedDataObj 加密后的数据对象
 * @param {string} password 用户密码
 * @returns {string} 解密后的明文数据
 */
function decryptData(encryptedDataObj, password) {
  const { encryptedData, salt, iv } = encryptedDataObj;
  const key = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 生成钱包并加密助记词
 * @param {string} password 用户密码（明文）
 * @returns {Promise<Object>} 包含加密后的助记词和公钥
 */
async function generateWalletData(password) {
  // 生成新的 Cosmos 钱包
  const cosmosWallet = await DirectSecp256k1HdWallet.generate(24, { prefix: "cosmos" });
  
  // 获取助记词和 Cosmos 公钥
  const mnemonic = cosmosWallet.mnemonic;
  const [cosmosAccount] = await cosmosWallet.getAccounts();
  const cosmosPublicKey = cosmosAccount.address;
  
  // 生成 Tura 钱包同助记词但不同前缀
  const turaWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "tura" });
  const [turaAccount] = await turaWallet.getAccounts();
  const turaPublicKey = turaAccount.address;

  // 加密助记词
  const encryptedMnemonic = encryptData(mnemonic, password);
  
  // 哈希密码
  const passwordHash = bcrypt.hashSync(password, 10);
  
  return {
    passwordHash,
    encryptedMnemonic,
    cosmosPublicKey,
    turaPublicKey,
    mnemonic,
  };
}

/**
 * 注册新钱包
 * @param {string} discordId Discord 用户 ID
 * @param {string} password 用户设置的密码
 * @returns {Promise<Object>} 包含钱包地址和提示信息
 */
async function registerNewWallet(discordId, password) {
  console.log(`[INFO] Generating new wallet for Discord ID: ${discordId}...`);

  // 检查用户是否已有钱包
  const existingWallet = await checkWallet(discordId);
  if (existingWallet) {
    console.log(`[INFO] Wallet already exists for Discord ID: ${discordId}`);
    throw new Error("A wallet already exists for this user.");
  }

  // 生成钱包数据
  const walletData = await generateWalletData(password);

  // 将新钱包保存到数据库
  const savedWallet = await createWallet(
    discordId, 
    walletData.passwordHash, 
    walletData.encryptedMnemonic, 
    walletData.cosmosPublicKey, 
    walletData.turaPublicKey
  );

  console.log(`[SUCCESS] Wallet registered for Discord ID: ${discordId}`);
  // 返回数据包含数据库内容
  return {
    cosmosAddress: savedWallet.cosmospublickey, // 修正字段名称
    turaAddress: savedWallet.turapublickey,     // 修正字段名称
    mnemonic: walletData.mnemonic,             // 将助记词直接返回（假设在 generateWalletData 中生成）
    message: "Your wallet has been created. Remember to save your mnemonic securely."
  };

}

/**
 * 更新用户密码
 * @param {string} discordId Discord 用户 ID
 * @param {string} oldPassword 用户当前密码（明文）
 * @param {string} newPassword 用户新密码（明文）
 * @returns {Promise<Object>} 返回更新后的钱包记录
 */
async function changeUserPassword(discordId, oldPassword, newPassword) {
  console.log(`[INFO] Updating password for Discord ID: ${discordId}...`);

  // 更新密码
  const updatedWallet = await updatePassword(
    discordId,
    oldPassword,
    newPassword
  );

  console.log(`[SUCCESS] Password updated for Discord ID: ${discordId}`);
  return {
    message: "Your password has been successfully updated."
  };
}

module.exports = { registerNewWallet, changeUserPassword };
