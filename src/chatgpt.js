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
    // 获取用户消息内容，确保消息内容有效
    const userMessageContent = message.content || '';

    // 设置系统消息提示
    const systemMessage = {
        role: 'system',
        content: 'You are a highly intelligent assistant specialized in providing wallet-related services and answering questions about decentralized finance. Your task is to assist the user in managing their wallet, providing security information, transaction help, and answering questions about blockchain technology, with an emphasis on clarity and accuracy.'
    };

    // 用户消息
    const conversationlog = [
        systemMessage,
        { role: 'user', content: userMessageContent }
    ];

    console.log('System message (messages[0]):', conversationlog[0]);
    console.log('User message (messages[1]):', conversationlog[1]);

    try {
        // 调用 GPT-4o-mini 完成对话
        const result = await openai.chat.completions.create({
            messages: conversationlog,
            model: "deepseek-chat",
        });

        // 确保 result 及其字段有效后再访问
        const responseText = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content
            ? result.choices[0].message.content.trim()  // 对返回的内容进行 trim() 处理
            : '';  // 如果没有有效内容，返回空字符串

        console.log('GPT-4o-mini response:', responseText);

        // 在响应后附加相关的嵌入界面提示
        let additionalInfo = '';
        if (topic === 'Account Information') {
            additionalInfo = 'Please make sure your account is verified.';
        }

        // 你可以将 additionalInfo 作为附加信息返回给用户
        return responseText + additionalInfo;

    } catch (error) {
        console.error('Error processing message:', error);
        return 'An error occurred while processing your request. Please try again later.';
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
    const userMessageContent = message.content;
    // 动态构建话题列表
    const topicsList = topics.join(", ");

    const systemMessage = {
        role: 'system',
        content: `You are a message filter designed to categorize user queries into predefined topics. Your task is to analyze the user’s message and return one of the following categories: ${topicsList}. Respond only with the name of the category. Do not provide any additional explanations.`
    };

    const conversationlog = [
        systemMessage,
        { role: 'user', content: userMessageContent }
    ];

    try {
        // 调用 GPT-4 进行消息分类
        const result = await openai.chat.completions.create({
            messages: conversationlog,
            model: "deepseek-chat",
        });

        const responseText = result.choices[0].userMessageContent.trim();
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
