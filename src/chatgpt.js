const { OpenAI } = require('openai');
require('dotenv/config');
/*
// 创建 OpenAI 客户端
const openai = new OpenAI({
    apiKey: process.env.OpenAIAPIKey,
});
*/
// 创建 DeepSeek 客户端
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DeepSeekAPI,
});

// 处理用户消息的函数
async function processUserMessage_generalagent(message, topic) {
    // 设置系统消息提示
    const systemMessage = {
        role: 'system',
        content: 'You are a highly intelligent assistant specialized in providing wallet-related services and answering questions about decentralized finance. Your task is to assist the user in managing their wallet, providing security information, transaction help, and answering questions about blockchain technology, with an emphasis on clarity and accuracy.'
    };

    // 用户消息
    const conversationlog = [
        systemMessage,
        { role: 'user', content: message }
    ];

    console.log('System message (messages[0]):', conversationlog[0]);
    console.log('User message (messages[1]):', conversationlog[1]);

    try {
        // 调用 GPT-4o-mini 完成对话
        const result = await openai.chat.completions.create({
            messages: conversationlog,
            model: "deepseek-chat",
        });

        const responseText = result.choices[0].message.content;
        console.log('GPT-4o-mini response:', responseText);

        // 在响应后附加相关的嵌入界面提示
        let additionalInfo = '';
        if (topic === 'Account Information') {
            additionalInfo = "\n\nYou can check your wallet information through the embedded interface below.";
        } else if (topic === 'Transfer Services') {
            additionalInfo = "\n\nYou can use the embedded interface to initiate transfers.";
        } else if (topic === 'Account Security and Privacy') {
            additionalInfo = "\n\nFor more details on security, check the relevant embedded interface.";
        } else if (topic === 'Claiming Rewards') {
            additionalInfo = "\n\nUse the embedded interface to claim your daily rewards.";
        } else if (topic === 'Tag Services') {
            additionalInfo = "\n\nCheck out the embedded interface for managing your tags.";
        } else if (topic === 'Casual Chat') {
            additionalInfo = "";
        }

        return responseText + additionalInfo;  // 返回 GPT 响应和相关提示
    } catch (error) {
        console.error("Error processing message:", error);
        return "Sorry, there was an error processing your request.";
    }
}


// Predefined list of topics
const topics = [
    'Account Information',
    'Transfer Services',
    'Account Security and Privacy',
    'Claiming Rewards',
    'Tag Services',
    'Casual Chat',
];

// 分类消息的函数
async function filterManager(message) {
    // 动态构建话题列表
    const topicsList = topics.join(", ");

    const systemMessage = {
        role: 'system',
        content: `You are a message filter designed to categorize user queries into predefined topics. Your task is to analyze the user’s message and return one of the following categories: ${topicsList}. Respond only with the name of the category. Do not provide any additional explanations.`
    };

    const conversationlog = [
        systemMessage,
        { role: 'user', content: message }
    ];

    try {
        // 调用 GPT-4 进行消息分类
        const result = await openai.chat.completions.create({
            messages: conversationlog,
            model: "deepseek-chat",
        });

        const responseText = result.choices[0].message.content.trim();
        console.log('FilterManager response:', responseText);

        // 确保返回的分类是预定义的某个话题
        if (topics.includes(responseText)) {
            return responseText;
        } else {
            return 'Casual Chat';  // 如果返回的分类无效，则默认是 "Casual Chat"
        }
    } catch (error) {
        console.error("Error processing message:", error);
        return 'Casual Chat';  // 出错时，返回默认分类
    }
}

module.exports = {
    filterManager,processUserMessage_generalagent
};
