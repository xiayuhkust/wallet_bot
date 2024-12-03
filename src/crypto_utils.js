const crypto = require("crypto");

// 配置默认加密参数
const SALT_LENGTH = 16; // 盐值长度
const IV_LENGTH = 16;   // 初始化向量长度
const KEY_LENGTH = 32;  // 密钥长度
const ALGORITHM = "aes-256-cbc"; // 加密算法

/**
 * 加密数据
 * @param {string} data 要加密的字符串（如私钥）
 * @param {string} password 用户的密码
 * @returns {string} 加密后的数据（包含盐值和 IV 的 JSON 字符串）
 */
function encryptData(data, password) {
  const salt = crypto.randomBytes(SALT_LENGTH); // 生成随机盐值
  const key = crypto.scryptSync(password, salt, KEY_LENGTH); // 使用 Scrypt 生成密钥
  const iv = crypto.randomBytes(IV_LENGTH); // 生成随机初始化向量

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return JSON.stringify({
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    encrypted,
  });
}

/**
 * 解密数据
 * @param {string} encryptedData 加密的字符串（JSON 格式，包含盐值和 IV）
 * @param {string} password 用户的密码
 * @returns {string} 解密后的数据
 */
function decryptData(encryptedData, password) {
  try {
    const { salt, iv, encrypted } = JSON.parse(encryptedData);
    const key = crypto.scryptSync(password, Buffer.from(salt, "hex"), KEY_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[ERROR] Failed to decrypt data:", error);
    throw new Error("Decryption failed. Invalid password or corrupted data.");
  }
}

module.exports = { encryptData, decryptData };
