// Pinecone chat integration
class PineconeChat {
    constructor(apiKey, assistantName) {
        this.apiKey = apiKey;
        this.assistantName = assistantName;
        this.messages = [];
    }

    async initialize() {
        // Initialize Pinecone client
        this.pc = new Pinecone({
            apiKey: this.apiKey
        });
        
        this.assistant = this.pc.assistant.Assistant({
            assistant_name: this.assistantName
        });
    }

    async sendMessage(message) {
        try {
            const msg = {
                content: message
            };
            
            this.messages.push(msg);
            
            // Get response from Pinecone
            const response = await this.assistant.chat(messages=[msg]);
            
            // Add response to messages
            this.messages.push(response.message);
            
            return response.message.content;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async sendMessageStream(message, onChunk) {
        try {
            const msg = {
                content: message
            };
            
            this.messages.push(msg);
            
            // Get streaming response from Pinecone
            const chunks = await this.assistant.chat(messages=[msg], stream=true);
            
            for await (const chunk of chunks) {
                if (chunk) {
                    onChunk(chunk);
                }
            }
        } catch (error) {
            console.error('Error sending message stream:', error);
            throw error;
        }
    }
}

// Initialize chat when document is ready
document.addEventListener('DOMContentLoaded', async () => {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessage');
    const chatBody = document.getElementById('chatBody');
    const typingIndicator = document.getElementById('typingIndicator');
    const stopButton = document.getElementById('stopBotResponse');
    
    // Initialize Pinecone chat
    const pineconeChat = new PineconeChat('pcsk_4tuTEE_4z7sMfZY3Trjqwq6gYEn1aR7DLcB5punbFEbsgPFo1k4Lex4uYv8EmSXinYvU1X', 'bidgpt');
    await pineconeChat.initialize();
    
    let isStreaming = false;
    
    // Function to add message to chat
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex gap-3 ${isUser ? 'justify-end' : ''}`;
        
        if (!isUser) {
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'w-10 h-10 bg-none rounded-full flex items-center justify-center flex-shrink-0';
            avatarDiv.innerHTML = '<img src="logo.png" alt="Chat Icon" class="w-full h-full object-fit" />';
            messageDiv.appendChild(avatarDiv);
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = `bg-white rounded-lg ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'} p-3 shadow-sm max-w-xs`;
        messageContent.innerHTML = `<p class="text-gray-800">${content}</p>`;
        messageDiv.appendChild(messageContent);
        
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }
    
    // Function to handle sending messages
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, true);
        chatInput.value = '';
        
        // Show typing indicator
        typingIndicator.classList.remove('hidden');
        stopButton.classList.remove('hidden');
        
        try {
            isStreaming = true;
            let fullResponse = '';
            
            // Stream the response
            await pineconeChat.sendMessageStream(message, (chunk) => {
                if (!isStreaming) return;
                fullResponse += chunk;
                // Update the last message with the new chunk
                const lastMessage = chatBody.lastElementChild;
                if (lastMessage) {
                    const messageContent = lastMessage.querySelector('p');
                    if (messageContent) {
                        messageContent.textContent = fullResponse;
                    }
                }
            });
            
            // Add final response to chat
            if (fullResponse) {
                addMessage(fullResponse);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('Sorry, there was an error processing your request.');
        } finally {
            // Hide typing indicator
            typingIndicator.classList.add('hidden');
            stopButton.classList.add('hidden');
            isStreaming = false;
        }
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Stop button functionality
    stopButton.addEventListener('click', () => {
        isStreaming = false;
        typingIndicator.classList.add('hidden');
        stopButton.classList.add('hidden');
    });
}); 