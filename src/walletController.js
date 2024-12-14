const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const crypto = require('crypto');    // 用于加密私钥和助记词
const { createWallet, checkWallet, updatePassword } = require("../models/wallet");
require('dotenv').config(); // 加载环境变量

/**
 * 加密函数：使用用户的 Discord ID 和随机盐加密数据
 * @param {string} data 明文数据
 * @param {string} userId 用户的 Discord ID
 * @returns {Object} 加密后的数据及相关参数
 */
function encryptData(data, userId) {
  const salt = crypto.randomBytes(16);  // 生成随机盐
  const key = crypto.scryptSync(userId, salt, 32);  // 使用 scrypt 算法生成加密密钥
  const iv = crypto.randomBytes(16);  // 初始化向量
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return { encryptedData: encrypted, salt: salt.toString('hex'), iv: iv.toString('hex') };
}

/**
 * 解密函数：使用用户的 Discord ID 解密数据
 * @param {Object} encryptedDataObj 加密后的数据对象
 * @param {string} userId 用户的 Discord ID
 * @returns {string} 解密后的明文数据
 */
function decryptData(encryptedDataObj, userId) {
  const { encryptedData, salt, iv } = encryptedDataObj;
  const key = crypto.scryptSync(userId, Buffer.from(salt, 'hex'), 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 生成钱包并加密助记词
 * @param {string} userId 用户的 Discord ID
 * @returns {Promise<Object>} 包含加密后的助记词和公钥
 */
async function generateWalletData(userId) {
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
  const encryptedMnemonic = encryptData(mnemonic, userId);
  
  return {
    encryptedMnemonic,
    cosmosPublicKey,
    turaPublicKey,
    mnemonic,
  };
}

/**
 * 注册新钱包
 * @param {string} discordId Discord 用户 ID
 * @returns {Promise<Object>} 包含钱包地址和提示信息
 */
async function registerNewWallet(discordId) {
  console.log(`[INFO] Generating new wallet for Discord ID: ${discordId}...`);

  // 检查用户是否已有钱包
  const existingWallet = await checkWallet(discordId);
  if (existingWallet) {
    console.log(`[INFO] Wallet already exists for Discord ID: ${discordId}`);
    throw new Error("A wallet already exists for this user.");
  }

  // 生成钱包数据
  const walletData = await generateWalletData(discordId);

  // 将新钱包保存到数据库
  const savedWallet = await createWallet(
    discordId, 
    walletData.encryptedMnemonic.encryptedData, 
    walletData.encryptedMnemonic.salt, 
    walletData.encryptedMnemonic.iv, 
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
 * 恢复钱包
 * @param {string} discordId Discord 用户 ID
 * @param {string} recoveryData 私钥或助记词
 * @param {boolean} isMnemonic 是否为助记词
 * @returns {Promise<Object>} 包含钱包地址和提示信息
 */
async function restoreWallet_Mnemonic(discordId, mnemonic) {
  console.log(`[INFO] Restoring wallet for Discord ID: ${discordId} using mnemonic...`);

  // 检查用户是否已有钱包
  const existingWallet = await checkWallet(discordId);
  if (existingWallet) {
    console.log(`[INFO] Wallet already exists for Discord ID: ${discordId}, it will be overwritten.`);
  }

  // 使用助记词生成 Cosmos 钱包
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "cosmos" });

  // 获取 Cosmos 公钥
  const [cosmosAccount] = await wallet.getAccounts();
  const cosmosPublicKey = cosmosAccount.address;

  // 生成 Tura 钱包同助记词但不同前缀
  const turaWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "tura" });
  const [turaAccount] = await turaWallet.getAccounts();
  const turaPublicKey = turaAccount.address;

  // 加密助记词
  const encryptedMnemonic = encryptData(mnemonic, discordId);

  // 将恢复的钱包保存到数据库
  const savedWallet = await createWallet(
    discordId,
    encryptedMnemonic,
    cosmosPublicKey,
    turaPublicKey
  );

  console.log(`[SUCCESS] Wallet restored for Discord ID: ${discordId}`);
  return {
    cosmosAddress: savedWallet.cosmospublickey,
    turaAddress: savedWallet.turapublickey,
    mnemonic: mnemonic,
    message: "Your wallet has been restored. Remember to save your mnemonic securely."
  };
}

/**
 * 使用私钥恢复钱包
 * @param {string} discordId Discord 用户 ID
 * @param {string} privateKey 私钥
 * @returns {Promise<Object>} 包含钱包地址和提示信息
 */
async function restoreWallet_PrivateKey(discordId, privateKey) {
  console.log(`[INFO] Restoring wallet for Discord ID: ${discordId} using private key...`);

  // 检查用户是否已有钱包
  const existingWallet = await checkWallet(discordId);
  if (existingWallet) {
    console.log(`[INFO] Wallet already exists for Discord ID: ${discordId}, it will be overwritten.`);
  }

  // 使用私钥生成 Cosmos 钱包
  const wallet = await DirectSecp256k1HdWallet.fromKey(Buffer.from(privateKey, 'hex'), "cosmos");

  // 获取 Cosmos 公钥
  const [cosmosAccount] = await wallet.getAccounts();
  const cosmosPublicKey = cosmosAccount.address;

  // 生成 Tura 钱包同私钥但不同前缀
  const turaWallet = await DirectSecp256k1HdWallet.fromKey(Buffer.from(privateKey, 'hex'), "tura");
  const [turaAccount] = await turaWallet.getAccounts();
  const turaPublicKey = turaAccount.address;

  // 加密私钥
  const encryptedPrivateKey = encryptData(privateKey, discordId);

  // 将恢复的钱包保存到数据库
  const savedWallet = await createWallet(
    discordId,
    encryptedPrivateKey,
    cosmosPublicKey,
    turaPublicKey
  );

  console.log(`[SUCCESS] Wallet restored for Discord ID: ${discordId}`);
  return {
    cosmosAddress: savedWallet.cosmospublickey,
    turaAddress: savedWallet.turapublickey,
    privateKey: privateKey,
    message: "Your wallet has been restored. Remember to save your private key securely."
  };
}

/**
 * 解密助记词并生成 signer
 * @param {Object} encryptedMnemonic 加密后的助记词对象
 * @param {string} userId 用户的 Discord ID
 * @returns {Promise<Object>} signer 对象
 */
async function getSignerFromEncryptedMnemonic(encryptedMnemonic, userId) {
  const mnemonic = decryptData(encryptedMnemonic, userId);
  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "tura" });
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

module.exports = { 
  registerNewWallet, 
  getSignerFromEncryptedMnemonic, 
  restoreWallet_Mnemonic, 
  restoreWallet_PrivateKey 
};