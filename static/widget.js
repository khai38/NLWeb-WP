/**
 * NLWeb Chat Widget
 * A standalone chat widget that can be embedded in external websites
 * to connect to the NLWeb chat service
 */

(function() {
    'use strict';    // Configuration - Can be overridden by setting window.NLWEB_CONFIG
    const DEFAULT_CONFIG = {
        apiBaseUrl: 'https://nlweb-wp-production-98b3.up.railway.app/',
        widgetId: 'nlweb-chat-widget',
        title: 'Chat hỗ trợ',
        welcomeMessage: '👋 Tôi có thể giúp gì cho bạn?'
    };
    
    // Merge with global config if provided
    const config = window.NLWEB_CONFIG ? { ...DEFAULT_CONFIG, ...window.NLWEB_CONFIG } : DEFAULT_CONFIG;
    
    const NLWEB_API_BASE = config.apiBaseUrl;
    const WIDGET_ID = config.widgetId;
    
    // Widget state
    let isWidgetLoaded = false;
    let isWidgetOpen = false;
    let eventSource = null;
    let currentQuery = null;
    let messages = [];

    // Widget HTML structure
    const widgetHTML = `
        <div id="${WIDGET_ID}" class="nlweb-widget">
            <!-- Widget Toggle Button -->
            <div class="nlweb-toggle" id="nlweb-toggle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="nlweb-close-icon" style="display: none;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </span>
            </div>

            <!-- Widget Panel -->
            <div class="nlweb-panel" id="nlweb-panel" style="display: none;">                <div class="nlweb-header">
                    <h3>${config.title}</h3>
                    <button class="nlweb-minimize" id="nlweb-minimize">−</button>
                </div>
                
                <div class="nlweb-messages" id="nlweb-messages">
                    <div class="nlweb-welcome-message">
                        <p>${config.welcomeMessage}</p>
                    </div>
                </div>
                
                <div class="nlweb-input-area">
                    <input 
                        type="text" 
                        id="nlweb-input" 
                        placeholder="Type your question..."
                        autocomplete="off"
                    >
                    <button id="nlweb-send" disabled>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22,2 15,22 11,13 2,9"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Widget CSS styles
    const widgetCSS = `
        .nlweb-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .nlweb-toggle {
            width: 60px;
            height: 60px;
            background: #007bff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
            transition: all 0.3s ease;
        }

        .nlweb-toggle:hover {
            background: #0056b3;
            transform: scale(1.05);
        }

        .nlweb-panel {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }

        .nlweb-header {
            background: #007bff;
            color: white;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .nlweb-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .nlweb-minimize {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .nlweb-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: #f8f9fa;
        }

        .nlweb-welcome-message {
            text-align: center;
            color: #666;
            margin-bottom: 16px;
        }

        .nlweb-welcome-message p {
            margin: 0;
            padding: 12px;
            background: white;
            border-radius: 8px;
            display: inline-block;
        }

        .nlweb-message {
            margin-bottom: 12px;
            max-width: 80%;
        }

        .nlweb-message.user {
            margin-left: auto;
        }

        .nlweb-message.assistant {
            margin-right: auto;
        }

        .nlweb-message-bubble {
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.4;
        }

        .nlweb-message.user .nlweb-message-bubble {
            background: #007bff;
            color: white;
            border-bottom-right-radius: 4px;
        }

        .nlweb-message.assistant .nlweb-message-bubble {
            background: white;
            color: #333;
            border: 1px solid #e0e0e0;
            border-bottom-left-radius: 4px;
        }

        .nlweb-input-area {
            padding: 16px;
            background: white;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 8px;
        }

        .nlweb-input-area input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
        }

        .nlweb-input-area input:focus {
            border-color: #007bff;
        }

        .nlweb-input-area button {
            width: 36px;
            height: 36px;
            background: #007bff;
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .nlweb-input-area button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .nlweb-input-area button:not(:disabled):hover {
            background: #0056b3;
        }

        .nlweb-loading {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #666;
            font-style: italic;
        }

        .nlweb-loading::after {
            content: '';
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            animation: nlweb-spin 1s linear infinite;
        }

        @keyframes nlweb-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .nlweb-result-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
        }

        .nlweb-result-title {
            font-weight: 600;
            color: #007bff;
            text-decoration: none;
            display: block;
            margin-bottom: 4px;
        }

        .nlweb-result-title:hover {
            text-decoration: underline;
        }

        .nlweb-result-description {
            font-size: 13px;
            color: #666;
            line-height: 1.3;
        }

        /* Mobile responsiveness */
        @media (max-width: 480px) {
            .nlweb-panel {
                width: 300px;
                height: 400px;
            }
        }
    `;

    // Initialize the widget
    function initWidget() {
        if (isWidgetLoaded) return;
        
        // Inject CSS
        const style = document.createElement('style');
        style.textContent = widgetCSS;
        document.head.appendChild(style);

        // Inject HTML
        const widgetContainer = document.createElement('div');
        widgetContainer.innerHTML = widgetHTML;
        document.body.appendChild(widgetContainer);

        // Bind events
        bindEvents();
        
        isWidgetLoaded = true;
    }

    // Bind event listeners
    function bindEvents() {
        const toggle = document.getElementById('nlweb-toggle');
        const minimize = document.getElementById('nlweb-minimize');
        const input = document.getElementById('nlweb-input');
        const sendButton = document.getElementById('nlweb-send');

        toggle.addEventListener('click', toggleWidget);
        minimize.addEventListener('click', closeWidget);
        
        input.addEventListener('input', (e) => {
            sendButton.disabled = !e.target.value.trim();
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                sendMessage();
            }
        });
        
        sendButton.addEventListener('click', sendMessage);
    }

    // Toggle widget open/close
    function toggleWidget() {
        const panel = document.getElementById('nlweb-panel');
        const chatIcon = document.querySelector('.nlweb-toggle svg:first-child');
        const closeIcon = document.querySelector('.nlweb-close-icon');
        
        if (isWidgetOpen) {
            panel.style.display = 'none';
            chatIcon.style.display = 'block';
            closeIcon.style.display = 'none';
            isWidgetOpen = false;
        } else {
            panel.style.display = 'flex';
            chatIcon.style.display = 'none';
            closeIcon.style.display = 'block';
            isWidgetOpen = true;
            
            // Focus input when opening
            setTimeout(() => {
                document.getElementById('nlweb-input').focus();
            }, 100);
        }
    }

    // Close widget
    function closeWidget() {
        toggleWidget();
    }

    // Send message
    function sendMessage() {
        const input = document.getElementById('nlweb-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to UI
        addMessage(message, 'user');
        
        // Clear input
        input.value = '';
        document.getElementById('nlweb-send').disabled = true;
        
        // Show loading state
        addLoadingMessage();
        
        // Send to NLWeb API
        sendToNLWeb(message);
    }

    // Add message to UI
    function addMessage(content, sender) {
        const messagesContainer = document.getElementById('nlweb-messages');
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.nlweb-welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `nlweb-message ${sender}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'nlweb-message-bubble';
        
        if (typeof content === 'string') {
            bubbleDiv.textContent = content;
        } else {
            bubbleDiv.appendChild(content);
        }
        
        messageDiv.appendChild(bubbleDiv);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        messages.push({ content, sender });
    }

    // Add loading message
    function addLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'nlweb-loading';
        loadingDiv.textContent = 'Thinking...';
        loadingDiv.id = 'nlweb-loading-msg';
        
        addMessage(loadingDiv, 'assistant');
    }

    // Remove loading message
    function removeLoadingMessage() {
        const loadingMsg = document.getElementById('nlweb-loading-msg');
        if (loadingMsg) {
            loadingMsg.closest('.nlweb-message').remove();
        }
    }

    // Send request to NLWeb API
    function sendToNLWeb(message) {
        // Generate a unique query ID
        const timestamp = new Date().getTime();
        const queryId = `widget_${timestamp}_${Math.floor(Math.random() * 1000)}`;
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('query_id', queryId);
        queryParams.append('query', message);
        queryParams.append('site', 'all');
        queryParams.append('generate_mode', 'list');
        queryParams.append('prev', JSON.stringify([]));
        queryParams.append('item_to_remember', '');
        queryParams.append('context_url', '');
        
        const url = `${NLWEB_API_BASE}/ask?${queryParams.toString()}`;
        
        // Close existing EventSource if any
        if (eventSource) {
            eventSource.close();
        }
        
        // Try to use fetch first to check CORS
        fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            // If fetch succeeds, use EventSource
            createEventSource(url);
        }).catch(error => {
            console.error('CORS or network error:', error);
            removeLoadingMessage();
            
            // Try alternative: use JSONP or proxy
            if (error.message.includes('CORS') || error.name === 'TypeError') {
                addMessage('CORS Error: Please ensure your NLWeb server allows cross-origin requests from this domain.', 'assistant');
                
                // Suggest solutions
                const solutionDiv = document.createElement('div');
                solutionDiv.innerHTML = `
                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; font-size: 12px;">
                        <strong>Solutions:</strong><br>
                        1. Add CORS headers to your NLWeb server<br>
                        2. Run both projects on the same domain<br>
                        3. Use a reverse proxy
                    </div>
                `;
                addMessage(solutionDiv, 'assistant');
            } else {
                addMessage('Network error: Cannot connect to NLWeb service. Please check if the server is running.', 'assistant');
            }
        });
    }
    
    // Create EventSource connection
    function createEventSource(url) {
        eventSource = new EventSource(url);
        let hasReceivedFirstMessage = false;
        let currentItems = [];
        
        eventSource.onopen = () => {
            console.log('Connected to NLWeb API');
        };
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Remove loading message on first response
                if (!hasReceivedFirstMessage) {
                    removeLoadingMessage();
                    hasReceivedFirstMessage = true;
                }
                
                handleNLWebMessage(data);
                
            } catch (error) {
                console.error('Error parsing message:', error);
                removeLoadingMessage();
                addMessage('Error parsing server response.', 'assistant');
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            removeLoadingMessage();
            
            // More specific error messages
            if (eventSource.readyState === EventSource.CONNECTING) {
                addMessage('Connecting to NLWeb service...', 'assistant');
            } else if (eventSource.readyState === EventSource.CLOSED) {
                addMessage('Connection to NLWeb service was closed. Please try again.', 'assistant');
            } else {
                addMessage('Sorry, there was an error connecting to the service. Please try again.', 'assistant');
            }
            
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
        };
    }

    // Handle messages from NLWeb API
    function handleNLWebMessage(data) {
        if (!data || !data.message_type) return;
        
        switch (data.message_type) {
            case 'result_batch':
                if (data.results && Array.isArray(data.results)) {
                    const resultsContainer = document.createElement('div');
                    
                    data.results.forEach(item => {
                        const resultDiv = createResultItem(item);
                        resultsContainer.appendChild(resultDiv);
                    });
                    
                    if (data.results.length > 0) {
                        addMessage(resultsContainer, 'assistant');
                    }
                }
                break;
                
            case 'intermediate_message':
            case 'summary':
                if (data.message) {
                    addMessage(data.message, 'assistant');
                }
                break;
                
            case 'complete':
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }
                break;
                
            case 'nlws':
                if (data.answer) {
                    addMessage(data.answer, 'assistant');
                }
                if (data.items && Array.isArray(data.items)) {
                    const resultsContainer = document.createElement('div');
                    data.items.forEach(item => {
                        const resultDiv = createResultItem(item);
                        resultsContainer.appendChild(resultDiv);
                    });
                    if (data.items.length > 0) {
                        addMessage(resultsContainer, 'assistant');
                    }
                }
                break;
        }
    }

    // Create result item HTML
    function createResultItem(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'nlweb-result-item';
        
        // Title with link
        if (item.name && item.url) {
            const titleLink = document.createElement('a');
            titleLink.className = 'nlweb-result-title';
            titleLink.href = item.url;
            titleLink.target = '_blank';
            titleLink.rel = 'noopener noreferrer';
            titleLink.textContent = item.name;
            itemDiv.appendChild(titleLink);
        } else if (item.name) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'nlweb-result-title';
            titleDiv.textContent = item.name;
            itemDiv.appendChild(titleDiv);
        }
        
        // Description
        if (item.description) {
            const descDiv = document.createElement('div');
            descDiv.className = 'nlweb-result-description';
            descDiv.textContent = item.description;
            itemDiv.appendChild(descDiv);
        }
        
        return itemDiv;
    }

    // Initialize widget when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }

    // Expose global functions for external use
    window.NLWebWidget = {
        open: () => {
            if (!isWidgetOpen) toggleWidget();
        },
        close: () => {
            if (isWidgetOpen) toggleWidget();
        },
        sendMessage: (message) => {
            if (!isWidgetOpen) toggleWidget();
            const input = document.getElementById('nlweb-input');
            if (input && message) {
                input.value = message;
                sendMessage();
            }
        }
    };

})();
