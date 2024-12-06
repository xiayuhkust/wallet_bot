// wallet.js
const { getClient } = require("../src/db");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * 创建新钱包记录
 * @param {string} userId Discord 用户 ID
 * @param {string} passwordHash 用户密码哈希
 * @param {Object} encryptedMnemonic 加密的助记词
 * @param {string} cosmosPublicKey Cosmos 公钥
 * @param {string} turaPublicKey Tura 公钥
 * @returns {Promise<Object>} 返回新创建的钱包记录
 */
async function createWallet(userId, passwordHash, encryptedMnemonic, cosmosPublicKey, turaPublicKey) {
  try {
    const client = getClient();
    if (!client) {
      throw new Error("Database connection is not initialized.");
    }

    const query = `
      INSERT INTO discord_wallets (
        id, 
        user_id, 
        password_hash, 
        salt, 
        encrypted_mnemonic, 
        cosmosPublicKey, 
        turaPublicKey,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
      RETURNING *;
    `;
    
    // 提取盐值和哈希
    const salt = encryptedMnemonic.salt;
    const hash = passwordHash;
    const encryptedMnemonicData = {
      encryptedData: encryptedMnemonic.encryptedData,
      salt: encryptedMnemonic.salt,
      iv: encryptedMnemonic.iv
    };

    const values = [
      userId,
      hash,
      salt,
      JSON.stringify(encryptedMnemonicData),
      cosmosPublicKey,
      turaPublicKey
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("[ERROR] Failed to create wallet:", error);
    throw new Error("Database query failed");
  }
}

/**
 * 检查用户是否已有钱包
 * @param {string} userId Discord 用户 ID
 * @returns {Promise<Object|null>} 返回钱包记录或 null
 */
async function checkWallet(userId) {
  try {
    const client = getClient();
    if (!client) {
      throw new Error("Database connection is not initialized.");
    }

    const query = "SELECT * FROM discord_wallets WHERE user_id = $1";
    const result = await client.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("[ERROR] Failed to check wallet:", error);
    throw new Error("Database query failed");
  }
}

/**
 * 更新用户密码
 * @param {string} userId Discord 用户 ID
 * @param {string} oldPassword 用户当前密码（明文）
 * @param {string} newPassword 用户新密码（明文）
 * @returns {Promise<Object>} 返回更新后的钱包记录
 */
async function updatePassword(userId, oldPassword, newPassword) {
  try {
    const client = getClient();
    if (!client) {
      throw new Error("Database connection is not initialized.");
    }

    // 获取当前钱包记录
    const wallet = await checkWallet(userId);
    if (!wallet) {
      throw new Error("Wallet does not exist.");
    }

    // 解密助记词
    const encryptedMnemonic = JSON.parse(wallet.encrypted_mnemonic);
    const decryptedMnemonic = decryptData(encryptedMnemonic, oldPassword);

    // 重新加密助记词
    const newEncryptedMnemonic = encryptData(decryptedMnemonic, newPassword);

    // 哈希新密码
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

    // 更新数据库中的密码哈希、盐值和加密后的助记词
    const query = `
      UPDATE discord_wallets
      SET password_hash = $1, salt = $2, encrypted_mnemonic = $3, updated_at = NOW()
      WHERE user_id = $4
      RETURNING *;
    `;
    const values = [
      newPasswordHash,
      newEncryptedMnemonic.salt,
      JSON.stringify({
        encryptedData: newEncryptedMnemonic.encryptedData,
        salt: newEncryptedMnemonic.salt,
        iv: newEncryptedMnemonic.iv
      }),
      userId
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("[ERROR] Failed to update password:", error);
    throw new Error("Failed to update password.");
  }
}

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

module.exports = { createWallet, checkWallet, updatePassword };
