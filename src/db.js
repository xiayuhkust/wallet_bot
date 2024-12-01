// 引入 PostgreSQL 客户端（pg）
const { Client } = require("pg");
require("dotenv").config();

// 从环境变量中获取数据库 URL
const dbUrl = process.env.DB_URL; // 从 .env 中获取连接信息

// 创建 PostgreSQL 客户端实例
const client = new Client({
  connectionString: dbUrl,
});

async function connectToDatabase() {
  try {
    // 连接到 PostgreSQL 数据库
    await client.connect();
    console.log("Connected to PostgreSQL!");

    // 返回客户端实例，您可以用它来执行查询或进行其他数据库操作
    return client;
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
    process.exit(1);
  }
}

// 关闭数据库连接
async function disconnectFromDatabase() {
  try {
    await client.end();
    console.log("Disconnected from PostgreSQL!");
  } catch (error) {
    console.error("Error disconnecting from PostgreSQL:", error);
  }
}

module.exports = { connectToDatabase, disconnectFromDatabase };
