const API_KEY = 'AIzaSyBjovswNdpQx8ta4_UzyOl45qf_K4LvkbA'; 
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

let abortController = null;
let typingInterval = null;

async function generateResponse(prompt) {
    abortController = new AbortController();
    const signal = abortController.signal;

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        }),
        signal
    });

    if (!response.ok) throw new Error('Failed to generate response');
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function cleanMarkdown(text) {
    return text
        .replace(/#{1,6}\s?/g, '')
        .replace(/\*\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function isUserNearBottom() {
    return (chatMessages.scrollHeight - chatMessages.clientHeight - chatMessages.scrollTop) < 50;
}

function addMessage(message, isUser) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isUser ? 'user-message' : 'bot-message');

    const profileImage = document.createElement('img');
    profileImage.classList.add('profile-image');
    profileImage.src = isUser ? 'user.jpg' : 'bot.jpg';
    profileImage.alt = isUser ? 'User' : 'Bot';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageElement.appendChild(profileImage);
    messageElement.appendChild(messageContent);
    chatMessages.appendChild(messageElement);

    if (isUser) {
        // User message instantly displayed
        messageContent.textContent = message;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        // Bot message with typing effect
        let index = 0;
        messageContent.textContent = '';
        
        if (typingInterval) clearInterval(typingInterval);

        typingInterval = setInterval(() => {
            messageContent.textContent += message.charAt(index);
            index++;

            if (isUserNearBottom()) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            if (index >= message.length) {
                clearInterval(typingInterval);
                typingInterval = null;
                // Reset button and inputs when done
                sendButton.textContent = 'Send';
                sendButton.disabled = false;
                userInput.disabled = false;
                userInput.focus();
                abortController = null;
            }
        }, 20);
    }
}

async function handleUserInput() {
    // If generation is running, allow to stop it
    if (sendButton.textContent === 'Stop') {
        if (abortController) abortController.abort();
        if (typingInterval) {
            clearInterval(typingInterval);
            typingInterval = null;
        }
        sendButton.textContent = 'Send';
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
        addMessage('⚠️ Generation stopped.', false);
        abortController = null;
        return;
    }

    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    addMessage(userMessage, true);
    userInput.value = '';
    sendButton.textContent = 'Stop';
    sendButton.disabled = false;
    userInput.disabled = true;

    try {
        const botReply = await generateResponse(userMessage);
        addMessage(cleanMarkdown(botReply), false);
    } catch (error) {
        if (error.name === 'AbortError') {
            addMessage('Generation was stopped by user.', false);
        } else {
            console.error('Error:', error);
            addMessage('Sorry, I encountered an error. Please try again.', false);
        }
        sendButton.textContent = 'Send';
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
        abortController = null;
    }
}

sendButton.addEventListener('click', handleUserInput);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserInput();
    }
});