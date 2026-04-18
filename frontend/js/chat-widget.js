document.addEventListener('DOMContentLoaded', () => {
    // Only inject on authenticated pages or if specifically allowed
    // Here we inject it everywhere for convenience, but check if user is logged in
    const userId = localStorage.getItem('user_id');
    if (!userId) return; // Don't show chat on public landing/auth pages

    injectChatUI();
});

let chatHistory = [];

function injectChatUI() {
    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/chat-widget.css';
    document.head.appendChild(link);

    // Inject HTML
    const container = document.createElement('div');
    container.innerHTML = `
        <button id="ai-chat-btn" class="ai-chat-btn">✨</button>
        
        <div id="ai-chat-widget" class="ai-chat-widget">
            <div class="chat-header">
                <h3>Career Coach AI</h3>
                <button id="chat-close" class="chat-close">&times;</button>
            </div>
            <div id="chat-messages" class="chat-messages">
                <div class="chat-bubble ai">Hi there! 👋 I'm your AI career coach. What skills are you looking to improve today, or what roles are you applying for?</div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
                <button id="chat-send">➤</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // Event Listeners
    const widget = document.getElementById('ai-chat-widget');
    const toggleBtn = document.getElementById('ai-chat-btn');
    const closeBtn = document.getElementById('chat-close');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');
    const messagesDiv = document.getElementById('chat-messages');

    toggleBtn.addEventListener('click', () => {
        widget.classList.toggle('active');
        if (widget.classList.contains('active')) {
            input.focus();
        }
    });

    closeBtn.addEventListener('click', () => {
        widget.classList.remove('active');
    });

    // Send handlers
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        // Add user msg to UI & history
        appendMessage('user', text);
        chatHistory.push({ role: 'user', content: text });
        input.value = '';
        
        // Show typing indicator
        sendBtn.disabled = true;
        const typingId = showTypingIndicator();

        try {
            const res = await fetch('http://127.0.0.1:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatHistory })
            });
            const data = await res.json();
            
            removeTypingIndicator(typingId);
            sendBtn.disabled = false;

            if (res.ok && data.success) {
                appendMessage('ai', data.reply);
                chatHistory.push({ role: 'assistant', content: data.reply });
            } else {
                appendMessage('ai', 'Sorry, I encountered an issue reaching the server.');
            }
        } catch (err) {
            console.error(err);
            removeTypingIndicator(typingId);
            sendBtn.disabled = false;
            appendMessage('ai', 'Network error. Please try again later.');
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(role, text) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${role}`;
        
        // simple newline formatting
        bubble.innerHTML = text.replace(/\n/g, '<br>');
        
        messagesDiv.appendChild(bubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ai';
        bubble.id = id;
        bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        messagesDiv.appendChild(bubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}
