const Wallet = require("../models/wallet");

// 创建钱包
async function createWallet(userId, address, encryptedKey) {
  try {
    const wallet = new Wallet({
      user_id: userId,
      address: address,
      encrypted_key: encryptedKey,
    });

    const savedWallet = await wallet.save();
    console.log("Wallet created successfully:", savedWallet);
    return savedWallet;
  } catch (error) {
    console.error("Error creating wallet:", error.message);
    throw error;
  }
}

module.exports = { createWallet };
