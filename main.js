document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();
    
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const voiceInputButton = document.getElementById('voice-input');
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const imageUpload = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageButton = document.getElementById('remove-image');
    const loadingOverlay = document.getElementById('loading-overlay');
    const quickResponses = document.getElementById('quick-responses');
    const closeChat = document.getElementById('close-chat');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        // Toggle dark mode class on html element
        document.documentElement.classList.toggle('dark');
        
        // Update icons visibility
        const darkModeIcon = document.querySelector('.dark-icon');
        const lightModeIcon = document.querySelector('.light-icon');
        
        if (document.documentElement.classList.contains('dark')) {
            darkModeIcon.classList.add('hidden');
            lightModeIcon.classList.remove('hidden');
            // Save preference to localStorage
            localStorage.setItem('theme', 'dark');
        } else {
            darkModeIcon.classList.remove('hidden');
            lightModeIcon.classList.add('hidden');
            // Save preference to localStorage
            localStorage.setItem('theme', 'light');
        }
        
        // Re-initialize Feather icons
        feather.replace();
    });
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        const darkModeIcon = document.querySelector('.dark-icon');
        const lightModeIcon = document.querySelector('.light-icon');
        if (darkModeIcon && lightModeIcon) {
            darkModeIcon.classList.add('hidden');
            lightModeIcon.classList.remove('hidden');
        }
    }
    
    // State variables
    let isListening = false;
    let selectedImage = null;
    let recognition = null;
    
    // Send message when user presses Enter
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send message when send button is clicked
    sendButton.addEventListener('click', sendMessage);
    
    // Voice input functionality
    voiceInputButton.addEventListener('click', toggleVoiceInput);
    
    // Image upload handling
    imageUploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });
    
    imageUpload.addEventListener('change', handleImageUpload);
    removeImageButton.addEventListener('click', removeImage);
    
    // Close chat button (minimizes/maximizes the chat)
    closeChat.addEventListener('click', () => {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer.classList.contains('minimized')) {
            chatContainer.classList.remove('minimized');
            chatContainer.style.height = 'calc(100vh - 100px)';
            chatMessages.style.height = 'calc(100% - 140px)';
            closeChat.innerHTML = '<i data-feather="minimize-2"></i>';
            feather.replace();
        } else {
            chatContainer.classList.add('minimized');
            chatContainer.style.height = '60px';
            chatMessages.style.height = '0';
            closeChat.innerHTML = '<i data-feather="maximize-2"></i>';
            feather.replace();
        }
    });
    
    // Show loading overlay
    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }
    
    // Hide loading overlay
    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }
    
    // Main function to send user message
    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '' && !selectedImage) return;
        
        // Add user message to chat
        if (selectedImage) {
            // If there's an image, display it with the message
            addMessageWithImage('user', message, selectedImage);
        } else {
            // Text-only message
            addMessageToChat('user', message);
        }
        
        userInput.value = '';
        
        // Hide any quick response buttons
        quickResponses.classList.add('hidden');
        quickResponses.innerHTML = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        if (selectedImage) {
            // Send both message and image
            sendImageWithQuery(selectedImage, message);
            removeImage();
        } else {
            // Send only text message
            fetchBotResponse(message);
        }
    }
    
    // Add a message with image to the chat UI
    function addMessageWithImage(sender, message, image) {
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message mb-4' : 'bot-message mb-4';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageUrl = e.target.result;
            
            if (sender === 'user') {
                messageDiv.innerHTML = `
                    <div class="flex justify-end">
                        <div class="user-message-content">
                            ${message ? `<p class="text-sm mb-2">${message}</p>` : ''}
                            <div class="image-container">
                                <img src="${imageUrl}" alt="User uploaded image" class="chat-image">
                            </div>
                        </div>
                    </div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="flex items-start">
                        <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2 flex-shrink-0 transition-colors duration-200">
                            <i data-feather="home" class="text-blue-500 dark:text-blue-400 w-4 h-4"></i>
                        </div>
                        <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-[85%] transition-colors duration-200">
                            ${message ? `<div class="message-content text-gray-800 dark:text-gray-200 text-sm transition-colors duration-200">${message}</div>` : ''}
                            <div class="image-container">
                                <img src="${imageUrl}" alt="Image" class="chat-image">
                            </div>
                        </div>
                    </div>
                `;
            }
            
            chatMessages.appendChild(messageDiv);
            feather.replace();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        
        reader.readAsDataURL(image);
    }
    
    // Show typing indicator while waiting for response
    function showTypingIndicator() {
        // Remove any existing typing indicator first
        removeTypingIndicator();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bot-message mb-4';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="flex items-start">
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2 flex-shrink-0 transition-colors duration-200">
                    <i data-feather="home" class="text-blue-500 dark:text-blue-400 w-4 h-4"></i>
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 transition-colors duration-200">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        feather.replace();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Replace typing indicator with in-chat loading for image analysis
    function replaceTypingWithImageLoading() {
        // Remove any existing typing indicator first
        removeTypingIndicator();
        // Also remove any existing in-chat loading
        removeInChatLoading();
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'bot-message mb-4';
        loadingDiv.id = 'in-chat-loading';
        loadingDiv.innerHTML = `
            <div class="flex items-start">
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2 flex-shrink-0 transition-colors duration-200">
                    <i data-feather="home" class="text-blue-500 dark:text-blue-400 w-4 h-4"></i>
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 transition-colors duration-200">
                    <div class="in-chat-loading">
                        <div class="loading-spinner"></div>
                        <span class="loading-text">Analyzing image...</span>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(loadingDiv);
        feather.replace();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Send image with query to backend
    async function sendImageWithQuery(image, query) {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('query', query || 'What maintenance issue can you identify in this image?');
        
        // Replace typing indicator with in-chat loading
        replaceTypingWithImageLoading();
        
        try {
            const response = await fetch('/api/image-analysis', {
                method: 'POST',
                body: formData,
            });
            
            const data = await response.json();
            
            // Remove in-chat loading indicator
            removeInChatLoading();
            
            if (data.error) {
                addMessageToChat('bot', `Sorry, I encountered an error analyzing the image: ${data.error}`);
            } else {
                addMessageToChat('bot', data.response);
            }
        } catch (error) {
            removeInChatLoading();
            addMessageToChat('bot', 'Sorry, I encountered an error while analyzing your image. Please try again.');
            console.error('Error:', error);
        }
    }
    
    // Add a message to the chat UI with typing effect
    function addMessageToChat(sender, message, options = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message mb-4' : 'bot-message mb-4';
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="user-message-content">
                    <p class="text-sm">${message}</p>
                </div>
            `;
            chatMessages.appendChild(messageDiv);
            feather.replace();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            // For bot messages - create the structure first
            const formattedMessage = formatBotMessage(message);
            
            messageDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2 flex-shrink-0 transition-colors duration-200">
                        <i data-feather="home" class="text-blue-500 dark:text-blue-400 w-4 h-4"></i>
                    </div>
                    <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-[85%] transition-colors duration-200">
                        <div class="message-content text-gray-800 dark:text-gray-200 text-sm transition-colors duration-200"></div>
                    </div>
                </div>
            `;
            
            chatMessages.appendChild(messageDiv);
            feather.replace();
            
            // Get the message content element for typing effect
            const messageContent = messageDiv.querySelector('.message-content');
            
            // Apply typing effect
            typeMessage(messageContent, formattedMessage, 0, 10);
            
            // If quick response buttons are provided
            if (options.quickResponses && options.quickResponses.length > 0) {
                setTimeout(() => {
                    showQuickResponseButtons(options.quickResponses);
                }, message.length * 10 + 500); // Show after typing is complete
            }
        }
    }
    
    // Function to create typing effect
    function typeMessage(element, text, index, speed) {
        if (index < text.length) {
            // Handle HTML tags properly
            if (text.charAt(index) === '<') {
                // Find the closing bracket
                const closingIndex = text.indexOf('>', index);
                if (closingIndex !== -1) {
                    // Add the entire tag at once
                    element.innerHTML += text.substring(index, closingIndex + 1);
                    index = closingIndex + 1;
                }
            } else {
                element.innerHTML += text.charAt(index);
                index++;
            }
            
            // Scroll to bottom as text is being typed
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Continue typing with a random speed variation for natural effect
            const randomSpeed = speed + Math.random() * 10 - 5;
            setTimeout(() => typeMessage(element, text, index, speed), randomSpeed);
        }
    }
    
    // Format bot message with proper styling
    function formatBotMessage(message) {
        // Convert markdown-style formatting to HTML
        
        // Replace markdown headings
        message = message.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        message = message.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        message = message.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Replace markdown bold
        message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Replace markdown italic
        message = message.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Replace markdown lists
        message = message.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');
        message = message.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
        
        // Wrap lists in <ul> or <ol>
        message = message.replace(/<li>.*?<\/li>/gs, function(match) {
            if (match.indexOf('1.') !== -1) {
                return '<ol>' + match + '</ol>';
            } else {
                return '<ul>' + match + '</ul>';
            }
        });
        
        // Replace markdown code blocks
        message = message.replace(/```(.*?)```/gs, '<pre>$1</pre>');
        
        // Replace inline code
        message = message.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Replace markdown links
        message = message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Replace newlines with <br> tags
        message = message.replace(/\n/g, '<br>');
        
        // Fix double <br> tags (common in formatted responses)
        message = message.replace(/<br><br>/g, '<br>');
        
        // Fix list formatting
        message = message.replace(/<\/li><br>/g, '</li>');
        
        return message;
    }
    
    // Show quick response buttons
    function showQuickResponseButtons(responses) {
        quickResponses.innerHTML = '';
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'flex flex-wrap gap-2';
        
        responses.forEach(response => {
            const button = document.createElement('button');
            button.className = 'quick-response-btn bg-white dark:bg-gray-700 border border-blue-500 dark:border-blue-400 text-blue-500 dark:text-blue-400 rounded-full px-4 py-1 text-sm hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-200';
            button.textContent = response;
            
            button.addEventListener('click', () => {
                // Mark this button as selected
                button.classList.add('selected-response');
                
                // Send this response as user message
                setTimeout(() => {
                    addMessageToChat('user', response);
                    fetchBotResponse(response);
                    
                    // Hide quick responses
                    quickResponses.classList.add('hidden');
                }, 300);
            });
            
            buttonsDiv.appendChild(button);
        });
        
        quickResponses.appendChild(buttonsDiv);
        quickResponses.classList.remove('hidden');
    }
    
    // Show typing indicator while waiting for response
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bot-message mb-4';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="flex items-start">
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2 flex-shrink-0 transition-colors duration-200">
                    <i data-feather="home" class="text-blue-500 dark:text-blue-400 w-4 h-4"></i>
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 transition-colors duration-200">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        feather.replace();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Remove typing indicator
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Fetch response from the backend
    async function fetchBotResponse(message) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            removeTypingIndicator();
            
            if (data.error) {
                addMessageToChat('bot', `Sorry, I encountered an error: ${data.error}`);
            } else {
                // Process the response
                const botResponse = data.response;
                
                // Check if this is a response that should have quick reply buttons
                let quickReplies = [];
                
                // Example: If the bot asks a yes/no question
                if (botResponse.toLowerCase().includes('?') && 
                    (botResponse.toLowerCase().includes('would you like') || 
                     botResponse.toLowerCase().includes('do you want') ||
                     botResponse.toLowerCase().includes('should i'))) {
                    quickReplies = ['Yes', 'No', 'Tell me more'];
                }
                
                // Add bot response with any quick replies
                addMessageToChat('bot', botResponse, { quickResponses: quickReplies });
            }
        } catch (error) {
            removeTypingIndicator();
            addMessageToChat('bot', 'Sorry, I encountered an error while processing your request. Please try again.');
            console.error('Error:', error);
        }
    }
    
    // Handle image upload
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }
        
        selectedImage = file;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        
        reader.readAsDataURL(file);
    }
    
    // Remove selected image
    function removeImage() {
        selectedImage = null;
        imageUpload.value = '';
        imagePreviewContainer.classList.add('hidden');
    }
    
    // Send image with query to backend
    async function sendImageWithQuery(image, query) {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('query', query || 'What maintenance issue can you identify in this image?');
        
        try {
            const response = await fetch('/api/image-analysis', {
                method: 'POST',
                body: formData,
            });
            
            const data = await response.json();
            
            // Hide loading overlay
            hideLoading();
            
            // Remove typing indicator
            removeTypingIndicator();
            
            if (data.error) {
                addMessageToChat('bot', `Sorry, I encountered an error analyzing the image: ${data.error}`);
            } else {
                addMessageToChat('bot', data.response);
            }
        } catch (error) {
            hideLoading();
            removeTypingIndicator();
            addMessageToChat('bot', 'Sorry, I encountered an error while analyzing your image. Please try again.');
            console.error('Error:', error);
        }
    }
    
    // Toggle voice input
    function toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Your browser does not support speech recognition. Please try Chrome or Edge.');
            return;
        }
        
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }
    
    // Start speech recognition
    function startListening() {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = true;
        
        recognition.onstart = function() {
            isListening = true;
            voiceInputButton.innerHTML = '<i data-feather="mic-off"></i>';
            feather.replace();
            userInput.placeholder = 'Listening...';
            userInput.classList.add('bg-red-50', 'dark:bg-red-900');
        };
        
        recognition.onresult = function(event) {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            
            userInput.value = transcript;
        };
        
        recognition.onend = function() {
            stopListening();
            if (userInput.value.trim() !== '') {
                setTimeout(() => sendMessage(), 500);
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            stopListening();
        };
        
        recognition.start();
    }
    
    // Stop speech recognition
    function stopListening() {
        if (recognition) {
            recognition.stop();
        }
        
        isListening = false;
        voiceInputButton.innerHTML = '<i data-feather="mic"></i>';
        feather.replace();
        userInput.placeholder = 'Send a message...';
        userInput.classList.remove('bg-red-50', 'dark:bg-red-900');
    }
});