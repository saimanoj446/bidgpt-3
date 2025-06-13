// BidGPT Chatbot with Pinecone Integration
class BidGPTChatbot {
    constructor() {
        // Hardcode the API key and assistant name
        this.apiKey = 'pcsk_4tuTEE_4z7sMfZY3Trjqwq6gYEn1aR7DLcB5punbFEbsgPFo1k4Lex4uYv8EmSXinYvU1X';
        this.assistantName = 'bidgpt';
        this.isOpen = false;
        this.isFeedbackModalOpen = false;
        this.messages = [];
        this.currentRating = 0;
        this.feedbackText = '';
        this.stopRequested = false;
        this.isBotResponding = false;
        this.currentBotTyping = null;
        this.currentBotTypingElement = null;
        this.currentBotTypingMessage = '';
        this.currentBotTypingIndex = 0;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Pinecone...');
            // Initialize Pinecone
            this.pc = new Pinecone({
                apiKey: this.apiKey,
                environment: 'gcp-starter'
            });
            
            console.log('Pinecone initialized, creating assistant...');
            // Initialize the assistant
            this.assistant = await this.pc.assistant.create({
                name: this.assistantName
            });
            
            console.log('Assistant created successfully');

            this.bindEvents();
            // Add stop button event listener after DOM is loaded
            setTimeout(() => {
                const stopButton = document.getElementById('stopBotResponse');
                if (stopButton) {
                    stopButton.addEventListener('click', () => this.handleStopBot());
                }
            }, 0);
        } catch (error) {
            console.error('Error initializing Pinecone:', error);
            // Show error to user
            this.showNotification('Failed to initialize chat. Please refresh the page.', 'error');
        }
    }

    renderMarkdown(text) {
        const escaped = this.escapeHtml(text);

        const lines = escaped.split('\n').map(line => {
            if (line.trim().startsWith('^')) {
                const content = line.trim().replace(/^(\^)\s*/, '');
                return `<div class="ml-6 list-disc list-inside text-sm">• ${content}</div>`;
            } else if (line.trim().startsWith('*')) {
                const content = line.trim().replace(/^(\*)\s*/, '');
                return `<div class="mt-2 list-disc list-inside text-sm">• ${content}</div>`;
            } else {
                return `<p>${line}</p>`;
            }
        });

        // Add bold/italic processing after bullets
        return lines.join('')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    bindEvents() {
        // Chat toggle functionality
        const chatButton = document.getElementById('chatButton');
        const closeChat = document.getElementById('closeChat');
        const chatWindow = document.getElementById('chatWindow');

        chatButton.addEventListener('click', () => this.toggleChat());
        closeChat.addEventListener('click', () => this.toggleChat());
    
        // Close chat when clicking backdrop on mobile
        chatWindow.addEventListener('click', (e) => {
            if (e.target === chatWindow) {
                this.toggleChat();
            }
        });

        // Feedback modal functionality
        const provideFeedbackBtn = document.getElementById('provideFeedbackBtn');
        const feedbackModal = document.getElementById('feedbackModal');
        const closeFeedbackModal = document.getElementById('closeFeedbackModal');
        const cancelFeedback = document.getElementById('cancelFeedback');
        const submitFeedback = document.getElementById('submitFeedback');
        const emojiButtons = document.querySelectorAll('.emoji-btn');

        provideFeedbackBtn.addEventListener('click', () => this.openFeedbackModal());
        closeFeedbackModal.addEventListener('click', () => this.closeFeedbackModal());
        cancelFeedback.addEventListener('click', () => this.closeFeedbackModal());
        submitFeedback.addEventListener('click', () => this.handleFeedbackSubmit());

        // Emoji rating functionality
        emojiButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.handleStarRating(rating);
                button.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 200);
            });
        });

        // Close feedback modal when clicking backdrop
        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) {
                this.closeFeedbackModal();
            }
        });

        // Tender options
        const tenderOptions = document.querySelectorAll('.tender-option');
        tenderOptions.forEach(option => {
            option.addEventListener('click', (e) => this.handleTenderClick(e));
        });

        // Chat input functionality
        const chatInput = document.getElementById('chatInput');
        const sendMessage = document.getElementById('sendMessage');

        sendMessage.addEventListener('click', () => this.handleSendMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });

        // Escape key to close modals and chat
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isFeedbackModalOpen) {
                    this.closeFeedbackModal();
                } else if (this.isOpen) {
                    this.toggleChat();
                }
            }
        });
    }

    toggleChat() {
        const chatWindow = document.getElementById('chatWindow');
        const pulsingRing = document.querySelector('.animate-ping');
        
        if (!this.isOpen) {
            chatWindow.style.display = 'block';
            chatWindow.offsetHeight;
            chatWindow.classList.remove('scale-0', 'opacity-0');
            pulsingRing.style.display = 'none';
            this.isOpen = true;
            
            setTimeout(() => {
                const chatInput = document.getElementById('chatInput');
                chatInput.focus();
            }, 300);
        } else {
            chatWindow.classList.add('scale-0', 'opacity-0');
            pulsingRing.style.display = 'block';
            setTimeout(() => {
                chatWindow.style.display = 'none';
            }, 300);
            this.isOpen = false;
        }
    }

    openFeedbackModal() {
        const feedbackModal = document.getElementById('feedbackModal');
        this.isFeedbackModalOpen = true;
        feedbackModal.classList.remove('hidden');
        
        setTimeout(() => {
            const feedbackText = document.getElementById('feedbackText');
            feedbackText.focus();
        }, 100);
    }

    closeFeedbackModal() {
        const feedbackModal = document.getElementById('feedbackModal');
        const feedbackText = document.getElementById('feedbackText');
        const submitButton = document.getElementById('submitFeedback');
        
        this.isFeedbackModalOpen = false;
        feedbackModal.classList.add('hidden');
        feedbackText.value = '';
        feedbackText.disabled = false;
        submitButton.classList.remove('btn-loading');
        
        this.currentRating = 0;
        const emojiButtons = document.querySelectorAll('.emoji-btn');
        emojiButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.style.opacity = '0.5';
        });
    }

    handleTenderClick(e) {
        const option = e.currentTarget;
        const tenderType = option.dataset.tender;
        const tenderTitle = option.querySelector('span').textContent;
        
        option.style.transform = 'scale(0.98)';
        setTimeout(() => {
            option.style.transform = '';
        }, 150);
        
        this.addUserMessage(`Tell me about ${tenderTitle}`);
        
        this.showTypingIndicator();
        setTimeout(() => {
            this.hideTypingIndicator();
            let response = this.getTenderResponse(tenderType);
            this.addBotMessage(response);
        }, 2000);
    }

    getTenderResponse(tenderType) {
        switch(tenderType) {
            case 'government':
                return 'Government tenders include opportunities from various government departments and agencies. These tenders cover infrastructure, services, and procurement needs across different sectors.';
            case 'state':
                return 'State tenders are issued by state government bodies and include opportunities for local infrastructure, services, and state-specific requirements. Each state may have different procedures and requirements.';
            case 'central':
                return 'Central tenders are issued by central government ministries and departments. These are typically larger scale projects with national scope and standardized procedures.';
            default:
                return 'Please select a specific type of tender to learn more.';
        }
    }

    handleStarRating(rating) {
        this.currentRating = rating;
        const emojiButtons = document.querySelectorAll('.emoji-btn');
        
        emojiButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.style.opacity = '0.5';
        });
        
        const selectedButton = document.querySelector(`.emoji-btn[data-rating="${rating}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
            selectedButton.style.opacity = '1';
        }
    }

    handleFeedbackSubmit() {
        const feedbackText = document.getElementById('feedbackText');
        const submitButton = document.getElementById('submitFeedback');
        
        if (this.currentRating === 0) {
            this.showNotification('Please select a rating', 'error');
            return;
        }
        
        this.feedbackText = feedbackText.value.trim();
        submitButton.classList.add('btn-loading');
        feedbackText.disabled = true;
        
        // Simulate feedback submission
        setTimeout(() => {
            this.submitFinalFeedback();
        }, 1000);
    }

    submitFinalFeedback() {
        const submitButton = document.getElementById('submitFeedback');
        submitButton.classList.remove('btn-loading');
        
        this.showNotification('Thank you for your feedback!', 'success');
        this.closeFeedbackModal();
    }

    handleStopBot() {
        this.stopRequested = true;
        if (this.currentBotTyping) {
            clearTimeout(this.currentBotTyping);
        }
        this.hideTypingIndicator();
        this.hideStopButton();
    }

    showStopButton() {
        const stopButton = document.getElementById('stopBotResponse');
        if (stopButton) {
            stopButton.classList.remove('hidden');
        }
    }

    hideStopButton() {
        const stopButton = document.getElementById('stopBotResponse');
        if (stopButton) {
            stopButton.classList.add('hidden');
        }
    }

    async handleSendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message || this.isBotResponding) return;
        
        this.addUserMessage(message);
        chatInput.value = '';
        this.showTypingIndicator();
        this.showStopButton();
        
        try {
            this.isBotResponding = true;
            this.stopRequested = false;
            
            console.log('Sending message to Pinecone...');
            const msg = {
                content: message
            };
            
            let fullResponse = '';
            
            // Get streaming response from Pinecone
            const chunks = await this.assistant.chat(messages=[msg], stream=true);
            
            console.log('Got response from Pinecone, processing chunks...');
            for await (const chunk of chunks) {
                if (this.stopRequested) break;
                if (chunk) {
                    fullResponse += chunk;
                    // Update the last message with the new chunk
                    const lastMessage = document.querySelector('#chatBody > div:last-child');
                    if (lastMessage) {
                        const messageContent = lastMessage.querySelector('p');
                        if (messageContent) {
                            messageContent.innerHTML = this.renderMarkdown(fullResponse);
                        }
                    }
                }
            }
            
            if (!this.stopRequested && fullResponse) {
                this.addBotMessage(fullResponse);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addBotMessage('Sorry, there was an error processing your request. Please try again.');
        } finally {
            this.isBotResponding = false;
            this.hideTypingIndicator();
            this.hideStopButton();
        }
    }

    addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex gap-3 justify-end';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'bg-chat-blue text-white rounded-lg rounded-tr-none p-3 shadow-sm max-w-xs';
        messageContent.innerHTML = `<p>${this.escapeHtml(message)}</p>`;
        
        messageDiv.appendChild(messageContent);
        document.getElementById('chatBody').appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex gap-3';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'w-10 h-10 bg-none rounded-full flex items-center justify-center flex-shrink-0';
        avatarDiv.innerHTML = '<img src="logo.png" alt="Chat Icon" class="w-full h-full object-fit" />';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-xs';
        messageContent.innerHTML = `<p>${this.renderMarkdown(message)}</p>`;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(messageContent);
        document.getElementById('chatBody').appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.classList.remove('hidden');
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.classList.add('hidden');
        }
    }

    scrollToBottom() {
        const chatBody = document.getElementById('chatBody');
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white transform translate-y-0 opacity-100 transition-all duration-300 ${
            type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateY(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chat when document is ready
document.addEventListener('DOMContentLoaded', async () => {
    const chatbot = new BidGPTChatbot();
    await chatbot.init();
}); 