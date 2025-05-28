// WeTalk PWA 主应用文件

class WeTalk {
    constructor() {
        this.audioRecorder = new AudioRecorder();
        this.settingsManager = new SettingsManager();
        this.apiService = new APIService(this.settingsManager);
        this.chatManager = new ChatManager();
        this.uiManager = new UIManager();
        this.isVoiceMode = true; // 默认语音模式
        this.storageKey = 'wetalk_settings';
        
        // 不在构造函数中调用init，而是在DOMContentLoaded事件中调用
    }

    async init() {
        console.log('WeTalk 应用开始初始化...');
        
        await this.settingsManager.init();
        console.log('设置管理器初始化完成');
        
        await this.chatManager.init();
        console.log('聊天管理器初始化完成');
        
        this.uiManager.init();
        console.log('UI管理器初始化完成');
        
        this.bindEvents();
        console.log('事件绑定完成');
        
        // 加载并显示历史聊天记录
        await this.loadHistoryMessages();
        console.log('历史消息加载完成');
        
        // 检查API密钥
        if (!this.settingsManager.getApiKey()) {
            this.uiManager.showSettings();
            this.uiManager.showError('请先配置OpenAI API密钥');
        }
        
        console.log('WeTalk 应用初始化完成');
    }

    async loadHistoryMessages() {
        try {
            const messages = this.chatManager.getMessages();
            if (messages.length > 0) {
                this.uiManager.updateChat(messages);
                // 加载历史消息后也要滚动到底部
                setTimeout(() => {
                    this.uiManager.scrollToBottom();
                }, 100);
            }
        } catch (error) {
            console.error('加载历史消息失败:', error);
        }
    }

    bindEvents() {
        console.log('开始绑定事件...');
        
        // 模式切换按钮事件
        const modeToggleBtn = document.getElementById('modeToggleBtn');
        console.log('模式切换按钮元素:', modeToggleBtn);
        
        if (modeToggleBtn) {
            // 创建绑定的方法引用
            if (!this.boundToggleInputMode) {
                this.boundToggleInputMode = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('点击事件触发');
                    
                    // 防抖机制
                    if (this.toggleTimeout) {
                        clearTimeout(this.toggleTimeout);
                    }
                    
                    this.toggleTimeout = setTimeout(() => {
                        console.log('模式切换按钮被点击');
                        this.toggleInputMode();
                        this.toggleTimeout = null;
                    }, 100);
                };
            }
            
            // 移除可能存在的旧事件监听器
            modeToggleBtn.removeEventListener('click', this.boundToggleInputMode);
            
            // 添加新的事件监听器
            modeToggleBtn.addEventListener('click', this.boundToggleInputMode);
            
            // 添加测试功能 - 双击直接测试
            modeToggleBtn.addEventListener('dblclick', () => {
                console.log('双击测试 - 直接操作DOM');
                const recordBtn = document.getElementById('recordBtn');
                const textInputContainer = document.getElementById('textInputContainer');
                
                if (recordBtn && textInputContainer) {
                    if (recordBtn.classList.contains('hidden')) {
                        recordBtn.classList.remove('hidden');
                        textInputContainer.classList.add('hidden');
                        console.log('测试：切换到语音模式');
                    } else {
                        recordBtn.classList.add('hidden');
                        textInputContainer.classList.remove('hidden');
                        console.log('测试：切换到文字模式');
                    }
                }
            });
        } else {
            console.error('找不到模式切换按钮');
        }
        
        // 录音按钮事件
        const recordBtn = document.getElementById('recordBtn');
        console.log('录音按钮元素:', recordBtn);
        console.log('录音按钮类名:', recordBtn ? recordBtn.className : 'null');
        
        if (recordBtn) {
            recordBtn.addEventListener('mousedown', this.startRecording.bind(this));
            recordBtn.addEventListener('mouseup', this.stopRecording.bind(this));
            recordBtn.addEventListener('mouseleave', this.cancelRecording.bind(this));
            
            // 触摸事件支持
            recordBtn.addEventListener('touchstart', this.startRecording.bind(this));
            recordBtn.addEventListener('touchend', this.stopRecording.bind(this));
            recordBtn.addEventListener('touchcancel', this.cancelRecording.bind(this));
        }
        
        // 文字输入事件
        const textInput = document.getElementById('textInput');
        const sendTextBtn = document.getElementById('sendTextBtn');
        const textInputContainer = document.getElementById('textInputContainer');
        
        console.log('文字输入元素:', textInput);
        console.log('发送按钮元素:', sendTextBtn);
        console.log('文字输入容器:', textInputContainer);
        console.log('文字输入容器类名:', textInputContainer ? textInputContainer.className : 'null');
        
        if (textInput && sendTextBtn) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendTextMessage();
                }
            });
            
            textInput.addEventListener('input', (e) => {
                const hasText = e.target.value.trim().length > 0;
                sendTextBtn.disabled = !hasText;
            });
            
            sendTextBtn.addEventListener('click', this.sendTextMessage.bind(this));
        }
        
        // 键盘事件支持
        this.isSpacePressed = false;
        this.isRecordingWithKeyboard = false;
        
        document.addEventListener('keydown', (e) => {
            // 如果在输入框中，不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // 只在语音模式下处理空格键录音
            if (this.isVoiceMode) {
                // 空格键开始录音
                if (e.code === 'Space' && !this.isSpacePressed && !this.isRecordingWithKeyboard) {
                    e.preventDefault();
                    this.isSpacePressed = true;
                    this.isRecordingWithKeyboard = true;
                    this.startRecording(e);
                }
                
                // ESC键取消录音
                if (e.code === 'Escape' && this.isRecordingWithKeyboard) {
                    e.preventDefault();
                    this.cancelRecording(e);
                    this.isSpacePressed = false;
                    this.isRecordingWithKeyboard = false;
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            // 如果在输入框中，不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // 只在语音模式下处理空格键录音
            if (this.isVoiceMode) {
                // 空格键松开发送录音
                if (e.code === 'Space' && this.isSpacePressed && this.isRecordingWithKeyboard) {
                    e.preventDefault();
                    this.stopRecording(e);
                    this.isSpacePressed = false;
                    this.isRecordingWithKeyboard = false;
                }
            }
        });
        
        // 设置按钮事件
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.uiManager.showSettings();
        });
        
        document.getElementById('apiKey').addEventListener('input', (e) => {
            this.settingsManager.setApiKey(e.target.value);
            // 清除之前的验证状态
            this.clearApiKeyStatus();
        });
        
        document.getElementById('validateApiKey').addEventListener('click', this.validateApiKey.bind(this));
        
        document.getElementById('language').addEventListener('change', (e) => {
            this.settingsManager.setLanguage(e.target.value);
        });
        
        document.getElementById('clearData').addEventListener('click', this.clearAllData.bind(this));
        
        // 设置面板事件
        const closeSettingsBtn = document.getElementById('closeSettings');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                console.log('关闭设置按钮被点击');
                this.uiManager.hideSettings();
            });
        } else {
            console.error('找不到closeSettings按钮');
        }
    }

    async startRecording(e) {
        e.preventDefault();
        
        if (!this.settingsManager.getApiKey()) {
            this.uiManager.showError('请先配置API密钥');
            return;
        }

        try {
            await this.audioRecorder.startRecording();
            this.uiManager.showRecordingOverlay();
            
            // 添加录音状态
            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.add('recording');
            
            // 如果是键盘录音，添加特殊样式和提示
            if (this.isRecordingWithKeyboard) {
                recordBtn.classList.add('keyboard-recording');
                const recordingStatus = document.querySelector('.recording-status');
                if (recordingStatus) {
                    recordingStatus.textContent = '🔴 录音中... (松开空格发送 | ESC取消)';
                }
            }
        } catch (error) {
            this.uiManager.showError('无法访问麦克风，请检查权限设置');
        }
    }

    async stopRecording(e) {
        e.preventDefault();
        
        if (!this.audioRecorder.isRecording) return;

        try {
            const audioBlob = await this.audioRecorder.stopRecording();
            this.uiManager.hideRecordingOverlay();
            
            // 移除录音状态
            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.remove('recording', 'keyboard-recording');
            
            if (audioBlob && audioBlob.size > 0) {
                await this.processAudio(audioBlob);
            }
        } catch (error) {
            this.uiManager.showError('录音处理失败');
        }
    }

    cancelRecording(e) {
        if (this.audioRecorder.isRecording) {
            this.audioRecorder.cancelRecording();
            this.uiManager.hideRecordingOverlay();
            
            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.remove('recording', 'keyboard-recording');
        }
    }

    async processAudio(audioBlob) {
        try {
            // 添加调试信息
            console.log('音频文件信息:', {
                size: audioBlob.size,
                type: audioBlob.type,
                duration: audioBlob.duration || '未知'
            });
            
            // 添加语音识别中的消息
            const recognizingMessage = {
                type: 'user',
                content: '正在识别语音...',
                timestamp: new Date(),
                isLoading: true
            };
            this.chatManager.addMessage(recognizingMessage);
            this.uiManager.updateChat(this.chatManager.getMessages());
            
            // 语音转文字
            const transcription = await this.apiService.transcribeAudio(audioBlob);
            const text = transcription.text;
            
            if (!text || text.trim() === '') {
                // 移除识别中的消息
                this.chatManager.removeLastMessage();
                this.uiManager.updateChat(this.chatManager.getMessages());
                throw new Error('未识别到语音内容，请重新录制');
            }
            
            // 移除识别中的消息，添加真正的用户消息
            this.chatManager.removeLastMessage();
            this.chatManager.addMessage({
                type: 'user',
                content: text,
                timestamp: new Date()
            });
            
            // 更新UI显示用户消息
            this.uiManager.updateChat(this.chatManager.getMessages());
            
            // 添加AI思考中的消息
            const thinkingMessage = {
                type: 'assistant',
                content: '正在翻译...',
                timestamp: new Date(),
                isLoading: true
            };
            this.chatManager.addMessage(thinkingMessage);
            this.uiManager.updateChat(this.chatManager.getMessages());
            
            // 翻译
            const context = this.chatManager.getContext();
            const translation = await this.apiService.translateText(text, context);
            
            // 移除思考中的消息，添加真正的回复
            this.chatManager.removeLastMessage();
            this.chatManager.addMessage({
                type: 'assistant',
                content: translation,
                timestamp: new Date()
            });
            
            // 更新UI
            this.uiManager.updateChat(this.chatManager.getMessages());
            
        } catch (error) {
            console.error('处理音频失败:', error);
            this.uiManager.showError(error.message);
        }
    }

    copyLastTranslation() {
        const lastTranslation = this.chatManager.getLastTranslation();
        if (lastTranslation) {
            navigator.clipboard.writeText(lastTranslation).then(() => {
                this.uiManager.showSuccess('已复制到剪贴板');
            }).catch(() => {
                this.uiManager.showError('复制失败');
            });
        } else {
            this.uiManager.showError('没有可复制的翻译内容');
        }
    }

    async clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
            await this.chatManager.clearAll();
            this.settingsManager.clearAll();
            this.uiManager.updateChat([]);
            this.uiManager.hideSettings();
            this.uiManager.showSuccess('数据已清除');
        }
    }

    async validateApiKey() {
        const apiKey = this.settingsManager.getApiKey();
        const validateBtn = document.getElementById('validateApiKey');
        const statusDiv = document.getElementById('apiKeyStatus');
        
        if (!apiKey || apiKey.trim() === '') {
            this.showApiKeyStatus('请先输入API密钥', 'error');
            return;
        }

        // 显示验证中状态
        validateBtn.disabled = true;
        validateBtn.classList.add('validating');
        validateBtn.textContent = '验证中...';
        this.showApiKeyStatus('正在验证API密钥...', 'validating');

        try {
            const result = await this.apiService.validateApiKey(apiKey);
            
            if (result.valid) {
                this.showApiKeyStatus(`✅ ${result.message} (可用模型: ${result.models}个)`, 'success');
            }
        } catch (error) {
            this.showApiKeyStatus(`❌ ${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            validateBtn.disabled = false;
            validateBtn.classList.remove('validating');
            validateBtn.textContent = '验证';
        }
    }

    showApiKeyStatus(message, type) {
        const statusDiv = document.getElementById('apiKeyStatus');
        statusDiv.textContent = message;
        statusDiv.className = `api-key-status ${type}`;
        statusDiv.classList.remove('hidden');
    }

    clearApiKeyStatus() {
        const statusDiv = document.getElementById('apiKeyStatus');
        statusDiv.classList.add('hidden');
        statusDiv.className = 'api-key-status hidden';
    }

    toggleInputMode() {
        console.log('toggleInputMode 被调用，当前模式:', this.isVoiceMode ? '语音模式' : '文字模式');
        
        this.isVoiceMode = !this.isVoiceMode;
        
        const recordBtn = document.getElementById('recordBtn');
        const textInputContainer = document.getElementById('textInputContainer');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        if (!recordBtn || !textInputContainer || !toggleIcon) {
            console.error('找不到必要的元素');
            return;
        }
        
        if (this.isVoiceMode) {
            // 切换到语音模式
            recordBtn.classList.remove('hidden');
            textInputContainer.classList.add('hidden');
            toggleIcon.textContent = '⌨️';
        } else {
            // 切换到文字模式
            recordBtn.classList.add('hidden');
            textInputContainer.classList.remove('hidden');
            toggleIcon.textContent = '🎤';
            
            // 聚焦到文字输入框
            setTimeout(() => {
                const textInput = document.getElementById('textInput');
                if (textInput) {
                    textInput.focus();
                }
            }, 100);
        }
        
        console.log('切换完成，新模式:', this.isVoiceMode ? '语音模式' : '文字模式');
    }

    async sendTextMessage() {
        const textInput = document.getElementById('textInput');
        const sendTextBtn = document.getElementById('sendTextBtn');
        const text = textInput.value.trim();
        
        if (!text) return;
        
        if (!this.settingsManager.getApiKey()) {
            this.uiManager.showError('请先配置API密钥');
            return;
        }
        
        try {
            // 清空输入框并禁用发送按钮
            textInput.value = '';
            sendTextBtn.disabled = true;
            
            // 添加用户消息
            this.chatManager.addMessage({
                type: 'user',
                content: text,
                timestamp: new Date()
            });
            
            // 更新UI显示用户消息
            this.uiManager.updateChat(this.chatManager.getMessages());
            
            // 添加AI思考中的消息
            const thinkingMessage = {
                type: 'assistant',
                content: '正在翻译...',
                timestamp: new Date(),
                isLoading: true
            };
            this.chatManager.addMessage(thinkingMessage);
            this.uiManager.updateChat(this.chatManager.getMessages());
            
            // 翻译
            const context = this.chatManager.getContext();
            const translation = await this.apiService.translateText(text, context);
            
            // 移除思考中的消息，添加真正的回复
            this.chatManager.removeLastMessage();
            this.chatManager.addMessage({
                type: 'assistant',
                content: translation,
                timestamp: new Date()
            });
            
            // 更新UI
            this.uiManager.updateChat(this.chatManager.getMessages());
            
        } catch (error) {
            console.error('处理文字失败:', error);
            this.uiManager.showError(error.message);
            
            // 移除可能存在的loading消息
            if (this.chatManager.getMessages().length > 0) {
                const lastMessage = this.chatManager.getMessages()[this.chatManager.getMessages().length - 1];
                if (lastMessage.isLoading) {
                    this.chatManager.removeLastMessage();
                    this.uiManager.updateChat(this.chatManager.getMessages());
                }
            }
        } finally {
            // 恢复发送按钮状态
            sendTextBtn.disabled = false;
        }
    }
}

// 音频录制器类
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000  // 添加采样率设置
                } 
            });
            
            // 尝试使用更兼容的音频格式
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = ''; // 使用默认格式
                    }
                }
            }
            
            const options = mimeType ? { mimeType } : {};
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            
            this.audioChunks = [];
            this.isRecording = true;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start();
            
            // 60秒后自动停止
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, 60000);
            
        } catch (error) {
            throw new Error('无法访问麦克风');
        }
    }

    async stopRecording() {
        return new Promise((resolve) => {
            if (!this.isRecording || !this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.cleanup();
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    cancelRecording() {
        if (this.isRecording && this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.cleanup();
        }
    }

    cleanup() {
        this.isRecording = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }
}

// API服务类
class APIService {
    constructor(settingsManager) {
        this.baseURL = 'https://api.openai.com/v1';
        this.errorHandler = new APIErrorHandler();
        this.settingsManager = settingsManager;
    }

    async validateApiKey(apiKey) {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API密钥不能为空');
        }

        try {
            const response = await fetch(`${this.baseURL}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                throw new Error('API密钥无效，请检查密钥是否正确');
            } else if (response.status === 429) {
                throw new Error('API请求频率过高，请稍后再试');
            } else if (!response.ok) {
                throw new Error(`API验证失败: ${response.status}`);
            }

            const data = await response.json();
            
            // 检查是否有可用的模型
            if (!data.data || data.data.length === 0) {
                throw new Error('API密钥有效，但没有可用的模型');
            }

            return {
                valid: true,
                message: 'API密钥验证成功',
                models: data.data.length
            };
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('网络连接失败，请检查网络连接');
            }
            throw error;
        }
    }

    async transcribeAudio(audioBlob) {
        const apiKey = this.settingsManager.getApiKey();
        if (!apiKey) {
            throw new Error('请先配置API密钥');
        }

        // 检查音频文件大小 (OpenAI限制25MB)
        if (audioBlob.size > 25 * 1024 * 1024) {
            throw new Error('音频文件过大，请录制较短的音频');
        }

        if (audioBlob.size < 1000) {
            throw new Error('音频文件过小，请重新录制');
        }

        // 根据音频类型设置正确的文件名
        let fileName = 'audio.webm';
        if (audioBlob.type.includes('mp4')) {
            fileName = 'audio.mp4';
        } else if (audioBlob.type.includes('wav')) {
            fileName = 'audio.wav';
        } else if (audioBlob.type.includes('ogg')) {
            fileName = 'audio.ogg';
        }

        const formData = new FormData();
        formData.append('file', audioBlob, fileName);
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'json');
        formData.append('temperature', '0.2');

        return await this.errorHandler.withRetry(async () => {
            const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                let errorMessage = `API错误: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.message) {
                        errorMessage = `API错误: ${errorData.error.message}`;
                    }
                } catch (e) {
                    // 如果无法解析错误响应，使用默认错误消息
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        });
    }

    async translateText(text, context) {
        const apiKey = this.settingsManager.getApiKey();
        if (!apiKey) {
            throw new Error('请先配置API密钥');
        }

        const prompt = this.buildTranslationPrompt(text, context);

        return await this.errorHandler.withRetry(async () => {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.3,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                throw new Error(`API错误: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        });
    }

    buildTranslationPrompt(text, context) {
        const contextText = context.length > 0 
            ? context.map(msg => `${msg.type === 'user' ? '用户' : '翻译'}: ${msg.content}`).join('\n')
            : '无';

        return `你是一个专业的中日翻译助手。请根据上下文将用户输入准确翻译。

规则：
1. 如果输入是中文，翻译成自然的日语
2. 如果输入是日文，翻译成自然的中文
3. 保持语气和语境的一致性
4. 考虑旅游场景的表达习惯
5. 只返回翻译结果，不要加额外说明

对话历史：
${contextText}

当前输入：${text}

翻译：`;
    }

    async convertToMp3(audioBlob) {
        // 简单的格式转换，实际项目中可能需要更复杂的音频处理
        return audioBlob;
    }
}

// 对话管理类
class ChatManager {
    constructor() {
        this.conversations = [];
        this.maxContextLength = 10;
        this.db = null;
    }

    async init() {
        this.db = new ConversationDB();
        await this.db.init();
        await this.loadConversations();
    }

    async loadConversations() {
        try {
            this.conversations = await this.db.getRecentConversations(50);
        } catch (error) {
            console.error('加载对话历史失败:', error);
            this.conversations = [];
        }
    }

    addMessage(message) {
        const messageWithId = {
            ...message,
            id: Date.now() + Math.random()
        };
        
        this.conversations.push(messageWithId);
        
        // 只有非loading消息才保存到数据库
        if (!message.isLoading) {
            this.db.saveConversation(messageWithId).catch(error => {
                console.error('保存对话失败:', error);
            });
        }
    }

    removeLastMessage() {
        if (this.conversations.length > 0) {
            this.conversations.pop();
        }
    }

    getMessages() {
        return this.conversations;
    }

    getContext() {
        return this.conversations
            .slice(-this.maxContextLength)
            .filter(msg => msg.content && msg.content.trim());
    }

    getLastTranslation() {
        const lastAssistantMessage = this.conversations
            .slice()
            .reverse()
            .find(msg => msg.type === 'assistant');
        
        return lastAssistantMessage ? lastAssistantMessage.content : null;
    }

    async clearAll() {
        this.conversations = [];
        if (this.db) {
            await this.db.clearAll();
        }
    }
}

// 设置管理类
class SettingsManager {
    constructor() {
        this.storageKey = 'wetalk_settings';
        this.settings = {
            apiKey: '',
            language: 'auto'
        };
    }

    async init() {
        this.loadSettings();
        this.updateUI();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    updateUI() {
        const apiKeyInput = document.getElementById('apiKey');
        const languageSelect = document.getElementById('language');
        
        if (apiKeyInput) apiKeyInput.value = this.settings.apiKey;
        if (languageSelect) languageSelect.value = this.settings.language;
    }

    getApiKey() {
        return this.settings.apiKey ? this.settings.apiKey.trim() : '';
    }

    setApiKey(apiKey) {
        this.settings.apiKey = apiKey ? apiKey.trim() : '';
        this.saveSettings();
    }

    getLanguage() {
        return this.settings.language;
    }

    setLanguage(language) {
        this.settings.language = language;
        this.saveSettings();
    }

    clearAll() {
        this.settings = {
            apiKey: '',
            language: 'auto'
        };
        localStorage.removeItem(this.storageKey);
        this.updateUI();
    }
}

// UI管理类
class UIManager {
    constructor() {
        this.elements = {};
    }

    init() {
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            recordingOverlay: document.getElementById('recordingOverlay'),
            settingsPanel: document.getElementById('settingsPanel'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            errorToast: document.getElementById('errorToast'),
            errorMessage: document.getElementById('errorMessage')
        };
    }

    updateChat(messages) {
        const container = this.elements.chatMessages;
        
        // 清除欢迎消息
        const welcomeMessage = container.querySelector('.welcome-message');
        if (welcomeMessage && messages.length > 0) {
            welcomeMessage.remove();
        }

        // 清空容器重新渲染（为了支持时间分组）
        const existingMessages = container.querySelectorAll('.message, .time-divider');
        existingMessages.forEach(el => el.remove());

        // 按时间分组渲染消息
        this.renderMessagesWithTimeGroups(container, messages);

        // 确保滚动到底部
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = this.elements.chatMessages;
        // 使用 requestAnimationFrame 确保DOM更新后再滚动
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }

    renderMessagesWithTimeGroups(container, messages) {
        let lastTimeGroup = null;

        messages.forEach(message => {
            const messageTime = new Date(message.timestamp);
            const timeGroup = this.getTimeGroup(messageTime);

            // 如果时间分组发生变化，添加时间分隔符
            if (timeGroup !== lastTimeGroup) {
                const timeDivider = this.createTimeDivider(timeGroup);
                container.appendChild(timeDivider);
                lastTimeGroup = timeGroup;
            }

            // 添加消息
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });
    }

    getTimeGroup(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (messageDate.getTime() === today.getTime()) {
            return '今天';
        } else if (messageDate.getTime() === yesterday.getTime()) {
            return '昨天';
        } else {
            return date.toLocaleDateString('zh-CN', {
                month: 'long',
                day: 'numeric'
            });
        }
    }

    createTimeDivider(timeText) {
        const div = document.createElement('div');
        div.className = 'time-divider';
        div.innerHTML = `<span class="time-text">${timeText}</span>`;
        return div;
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.type}`;
        
        if (message.isLoading) {
            div.classList.add('loading');
        }

        let content;
        if (message.isLoading) {
            if (message.type === 'user') {
                content = `<span class="loading-dots">正在识别语音<span class="dots">...</span></span>`;
            } else {
                content = `<span class="loading-dots">正在翻译<span class="dots">...</span></span>`;
            }
        } else {
            content = this.escapeHtml(message.content);
        }

        div.innerHTML = `
            <div class="message-content">${content}</div>
        `;

        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showRecordingOverlay() {
        this.elements.recordingOverlay.classList.remove('hidden');
    }

    hideRecordingOverlay() {
        this.elements.recordingOverlay.classList.add('hidden');
    }

    showSettings() {
        this.elements.settingsPanel.classList.remove('hidden');
    }

    hideSettings() {
        console.log('hideSettings被调用');
        console.log('settingsPanel元素:', this.elements.settingsPanel);
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.add('hidden');
            console.log('已添加hidden类');
        } else {
            console.error('settingsPanel元素不存在');
        }
    }

    showLoading(text = '处理中...') {
        const loadingText = this.elements.loadingOverlay.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = text;
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorToast.classList.remove('hidden');
        
        setTimeout(() => {
            this.elements.errorToast.classList.add('hidden');
        }, 3000);
    }

    showSuccess(message) {
        // 临时使用错误提示样式显示成功消息
        const toast = this.elements.errorToast;
        toast.style.backgroundColor = '#34C759';
        this.elements.errorMessage.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.style.backgroundColor = '';
        }, 2000);
    }
}

// 数据库类
class ConversationDB {
    constructor() {
        this.dbName = 'WeTalkDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('conversations')) {
                    const store = db.createObjectStore('conversations', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async saveConversation(conversation) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['conversations'], 'readwrite');
        const store = transaction.objectStore('conversations');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...conversation,
                timestamp: conversation.timestamp.getTime()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentConversations(limit = 50) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['conversations'], 'readonly');
        const store = transaction.objectStore('conversations');
        const index = store.index('timestamp');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const results = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    const conversation = cursor.value;
                    conversation.timestamp = new Date(conversation.timestamp);
                    results.push(conversation);
                    cursor.continue();
                } else {
                    resolve(results.reverse());
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async clearAll() {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['conversations'], 'readwrite');
        const store = transaction.objectStore('conversations');
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// 错误处理类
class APIErrorHandler {
    async withRetry(apiCall, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await apiCall();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw new Error(this.handleError(error));
                }
                await this.sleep(1000 * Math.pow(2, i));
            }
        }
    }

    handleError(error) {
        if (error.message.includes('401')) {
            return 'API密钥无效，请检查配置';
        } else if (error.message.includes('429')) {
            return '请求过于频繁，请稍后再试';
        } else if (error.message.includes('500')) {
            return '服务器错误，请稍后重试';
        } else if (error.message.includes('网络')) {
            return '网络连接失败，请检查网络';
        }
        
        return error.message || '未知错误，请重试';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 全局函数
window.copyText = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        // 显示复制成功提示
        const toast = document.getElementById('errorToast');
        const message = document.getElementById('errorMessage');
        
        toast.style.backgroundColor = '#34C759';
        message.textContent = '已复制到剪贴板';
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.style.backgroundColor = '';
        }, 2000);
    }).catch(() => {
        console.error('复制失败');
    });
};

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM 加载完成，开始初始化应用...');
    
    try {
        window.weTalk = new WeTalk();
        await window.weTalk.init();
        console.log('应用初始化成功');
    } catch (error) {
        console.error('应用初始化失败:', error);
    }
}); 