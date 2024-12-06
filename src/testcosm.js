const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const bcrypt = require('bcryptjs');  // 用于密码哈希
const crypto = require('crypto');    // 用于加密私钥和助记词

// 加密函数：使用密码和随机盐加密数据
function encryptData(data, password) {
  const salt = crypto.randomBytes(16);  // 生成随机盐
  const key = crypto.scryptSync(password, salt, 32);  // 使用 scrypt 算法生成加密密钥
  const iv = crypto.randomBytes(16);  // 初始化向量
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return { encryptedData: encrypted, salt: salt.toString('hex'), iv: iv.toString('hex') };
}

// 解密函数：使用密码解密数据
function decryptData(encryptedData, password, salt, iv) {
  const key = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 验证密码是否正确
function verifyPassword(inputPassword, storedPasswordHash) {
    return bcrypt.compareSync(inputPassword, storedPasswordHash);
  }
  
// 创建钱包并加密私钥和助记词
async function generateWallet(password) {
  // 自动生成助记词和钱包
  const wallet = await DirectSecp256k1HdWallet.generate();
  
  // 获取生成的助记词和公钥（钱包地址）
  const mnemonic = wallet.mnemonic;
  const publicKey = (await wallet.getAccounts())[0].address;

  console.log("Generated Mnemonic:", mnemonic);
  console.log("Wallet Public Key:", publicKey);


  const encryptedMnemonic = encryptData(mnemonic, password);
  console.log("Encrypted Mnemonic:", encryptedMnemonic.encryptedData);

  // 哈希密码以供验证
  const passwordHash = bcrypt.hashSync(password, 10);
  console.log("Password Hash:", passwordHash);

  // 生成 Tura 公钥（通过修改 Cosmos 公钥前缀）
  const turaPublicKey = "tura" + publicKey.slice(6); // 假设通过去除 'cosmos' 前缀，替换为 'tura'

  // 返回必要信息
  return {
    passwordHash,
    encryptedMnemonic,
    cosmosPublicKey: publicKey, // 使用公钥作为 Cosmos 公钥
    turaPublicKey, // 生成 Tura 地址作为公钥
  };
}

// 示例：让玩家输入密码并生成钱包
async function test() {
  const password = "player-secret-password"; // 这里可以替换为用户输入的密码
  const walletData = await generateWallet(password);

  // 输出生成的完整数据
  console.log("Final Wallet Data:", walletData);
}

test();
