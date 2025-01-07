const axios = require("axios");

const config = {
  endpoint: 'https://tagfusion.org/'
  // endpoint: 'https://testnet1.turablockchain.com/'
  // endpoint: 'http://127.0.0.1:8000/'
};

const axiosInstance = axios.create({
  baseURL: config.endpoint,
  timeout: 10000,  // 设置超时时间为 10000 毫秒（10 秒）
  headers: {
    'Content-Type': 'application/json',
    // 如果需要身份验证，可以添加 'Authorization': 'Bearer YOUR_TOKEN'
  }
});

async function getCards() {
  try {
    const response = await axiosInstance.get("tagfusion/api/get_cards/");
    const result = await response.data;
    if (result.code === 0) {
      console.log("Categories:", result.data);
      if (result.data.length > 0) {
        console.log("Selected Category:", result.data[0].category_name); // 默认选中第一个标签类别
      }
    } else {
      console.error("ERROR");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

getCards();
