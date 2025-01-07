const { OpenAI } = require('openai');
require('dotenv/config');
// 创建 OpenAI 客户端
const openai = new OpenAI({
    apiKey: process.env.OpenAIAPIKey,
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

    try {
        // 调用 GPT-4o-mini 完成对话
        const result = await openai.chat.completions.create({
            model: 'gpt-4o-mini',  // 使用 gpt-4o-mini 模型
            messages: conversationlog,
            max_tokens: 3000,  // 调整响应长度
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
            model: 'gpt-4o-mini',
            messages: conversationlog,
            max_tokens: 150, // 保证返回简短的分类结果
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

async function ChatgptReply(message) {
    // 使用 filterManager 判断消息的主题
    const topic = await filterManager(message);
    console.log('Detected Topic:', topic);  // 打印检测到的主题

    // 根据检测到的主题将消息传递给 processUserMessage_generalagent 生成回复
    const response = await processUserMessage_generalagent(message, topic);
    console.log('Response from General Agent:', response);  // 打印生成的回复
}

// 测试不同的问题
async function runTests() {
    const testMessages = [
        "How can I check my wallet balance?",
        "How do I transfer my tokens?",
        "What steps should I take to secure my account?",
        "How can I claim my daily rewards?",
        "Tell me a joke, let's chat!"
    ];

    for (let message of testMessages) {
        console.log(`\nTesting message: "${message}"`);
        await Chatgpt(message);  // 执行测试
    }
}

// 启动测试
runTests();

module.exports = {
    filterManager,processUserMessage_generalagent
};
