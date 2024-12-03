const { getClient } = require("../src/db");

/**
 * 检查用户是否已有钱包
 * @param {string} userId Discord 用户 ID
 * @returns {Promise<Object|null>} 返回钱包记录或 null
 */
async function checkWallet(userId) {
  try {
    const client = getClient(); // 使用共享的 client
    if (!client) {
      throw new Error("Database connection is not initialized.");
    }
    const result = await client.query("SELECT * FROM discord_wallets WHERE user_id = $1", [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("[ERROR] Failed to check wallet:", error);
    throw new Error("Database query failed");
  }
}

/**
 * 创建新钱包
 * @param {string} userId Discord 用户 ID
 * @param {string} address 钱包地址
 * @param {string} encryptedKey 加密的私钥
 */
async function createWallet(userId, address, encryptedKey) {
  try {
    const query = `
      INSERT INTO discord_wallets (user_id, address, encrypted_key, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *;
    `;
    const values = [userId, address, encryptedKey];
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("[ERROR] Failed to create wallet:", error);
    throw new Error("Database query failed");
  }
}

/**
 * 更新钱包的加密私钥
 * @param {string} userId Discord 用户 ID
 * @param {string} newEncryptedKey 新的加密私钥
 */
async function updateWalletKey(userId, newEncryptedKey) {
  try {
    const query = `
      UPDATE discord_wallets
      SET encrypted_key = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING *;
    `;
    const values = [newEncryptedKey, userId];
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("[ERROR] Failed to update wallet key:", error);
    throw new Error("Database query failed");
  }
}

module.exports = {
  checkWallet,
  createWallet,
  updateWalletKey,
};
