const mongoose = require("mongoose");

// 定义 Wallet Schema
const walletSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true }, // Discord 用户的唯一 ID
  address: { type: String, required: true }, // 用户钱包地址
  encrypted_key: { type: String, required: true }, // 加密存储的私钥
  created_at: { type: Date, default: Date.now }, // 钱包创建时间
  updated_at: { type: Date, default: Date.now }, // 最近一次更新钱包的时间
});

// 中间件：在保存时自动更新 `updated_at`
walletSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// 创建 Wallet 模型
const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
