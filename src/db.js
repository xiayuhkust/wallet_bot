const { Client } = require("pg");
require("dotenv").config();

const dbUrl = process.env.DB_URL;

let client;

async function connectToDatabase() {
  if (client) {
    console.log("Reusing existing database connection.");
    return client;
  }

  try {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    console.log("Connected to PostgreSQL!");
    return client;
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
    throw error; // 抛出错误以便外部处理
  }
}
function getClient() {
  if (!client) {
    throw new Error("[ERROR] Database client is not initialized. Call connectToDatabase first.");
  }
  return client;
}
async function disconnectFromDatabase() {
  if (!client) {
    console.log("No active database connection to close.");
    return;
  }

  try {
    await client.end();
    console.log("Disconnected from PostgreSQL!");
    client = null; // 重置 client
  } catch (error) {
    console.error("Error disconnecting from PostgreSQL:", error);
  }
}

module.exports = { connectToDatabase, disconnectFromDatabase, getClient };
