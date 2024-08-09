require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY, // This is the default and can be omitted
});
const fs = require("fs");
const models = require('../../models');

const getChatGPTResponse = async (prompt, model, maxTokens) => {
    try {
        const response = await openai.chat.completions.create({
            model: model, // Or another model like 'gpt-3.5-turbo' 'gpt-4o-mini'
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens, // Adjust the max tokens based on your needs
        });
        //return response.data.choices[0].text.trim();
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error getting response from ChatGPT:', error);
        return null;
    }
};

const getOrderAssistant = async (prompt, threadId, assistantId, customerNo, msg) => {
    let thread, run;
    let file = null;
    //asst_oUnuy7xi1OiXlGB74LN5v6F0
    //console.log(prompt, threadId, msg);
    if (msg.message?.documentWithCaptionMessage) {
        //to process image file
        file = await openai.files.create({
            file: fs.createReadStream("./public/documents/" + msg.message.documentWithCaptionMessage.message.documentMessage.fileName),
            purpose: "assistants",
        });
        let fileReady = false;
        let checkCounter = 0;
        const maxChecks = 10;

        while (!fileReady && checkCounter < maxChecks) {
            const fileStatus = await openai.files.retrieve(file.id);
            console.log("Checking file status:", fileStatus);

            if (fileStatus.status === 'processed') {
                fileReady = true;
                console.log("File is processed and ready to use.");
            } else if (fileStatus.status === 'failed') {
                throw new Error("File processing failed.");
            } else {
                checkCounter += 1;
                await sleep(2000); // Sleep for 2 seconds
            }
        }

        if (!fileReady) {
            throw new Error("File processing timed out.");
        }
    }
    //console.log(file);
    if (!threadId) {
        // Create new thread
        thread = await openai.beta.threads.create()
        console.log('Thread created', thread);
        await models.Thread.create({
            remoteJid: customerNo,
            threadId: thread.id,
        });
        threadId = thread.id;
    }

    // Add message
    if (file) {
        thread = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: prompt,
            attachments: [{
                file_id: file.id,
                tools: [{ type: 'file_search' }],
            }]
        });
    } else {
        thread = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: prompt,
        });
    }
    console.log(thread);

    run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
    });

    let counter = 0;
    while (counter < 100) {
        run = await openai.beta.threads.runs.retrieve(threadId, run.id);

        console.log(`[${new Date().toLocaleString()}]: Working... ${run.status}`);
        if (counter % 10 === 0) {
            console.log(`\t\t${JSON.stringify(run)}`);
        }

        if (run.status === 'completed' || run.status === 'failed') {
            console.log('completed result: ', run);
            break;
        }

        counter += 1;
        await sleep(2000); // Sleep for 2 seconds
    }
    if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(threadId);
        const responseMessages = messages.data.filter(message => message.role === 'assistant');
        console.log(responseMessages);
        if (responseMessages.length > 0) {
            const latestResponse = responseMessages[0].content;
            console.log(latestResponse);
            const latestResponseText = latestResponse[0].text.value;
            console.log(latestResponseText);
            //Need to refine return.
            return latestResponseText;
        }
    } else if (run.status === 'failed') {
        return "failed";
    }

};