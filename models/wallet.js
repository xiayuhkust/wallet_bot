// wallet.js
const { getClient } = require("../src/db");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * 创建新钱包记录
 * @param {string} userId Discord 用户 ID
 * @param {string} cosmosPublicKey Cosmos 公钥
 * @param {string} turaPublicKey Tura 公钥
 * @returns {Promise<Object>} 返回新创建的钱包记录
 */
async function createWallet(userId, cosmosPublicKey, turaPublicKey, encryptedMnemonic, keyType) {
  try {
    const client = getClient();
    if (!client) {
      throw new Error("Database connection is not initialized.");
    }

    const query = `
      INSERT INTO discord_wallets (
      id, 
      user_id, 
      cosmosPublicKey, 
      turaPublicKey,
      encryptedMnemonic,
      keyType,
      created_at,
      updated_at
      )
      VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
      cosmosPublicKey = EXCLUDED.cosmosPublicKey,
      turaPublicKey = EXCLUDED.turaPublicKey,
      encryptedMnemonic = EXCLUDED.encryptedMnemonic,
      keyType = EXCLUDED.keyType,
      updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      userId,
      cosmosPublicKey,
      turaPublicKey,
      JSON.stringify(encryptedMnemonic),
      keyType
    ];

    const result = await client.query(query, values);

    // 添加日志打印返回结果
    console.log('[DEBUG] Wallet creation result:', result.rows[0]);

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

    const query = `
      SELECT * FROM discord_wallets 
      WHERE user_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const result = await client.query(query, [userId]);
    return result.rows[0] || null;
    console.log('[DEBUG] Wallet check result:', result.rows[0]);
  } catch (error) {
    console.error("[ERROR] Failed to check wallet:", error);
    throw new Error("Database query failed");
  }
}



module.exports = { createWallet, checkWallet };
