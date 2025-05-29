// WeTalk PWA 主应用文件

class WeTalk {
    constructor() {
        this.audioRecorder = new AudioRecorder();
        this.settingsManager = new SettingsManager();
        this.apiService = new APIService(this.settingsManager);
        this.chatManager = new ChatManager();
        this.uiManager = new UIManager();
        this.ttsManager = new TTSManager(this.apiService, this.settingsManager);
        this.isVoiceMode = true; // 默认语音模式
        this.storageKey = 'wetalk_settings';
        this.isRecordingStarting = false; // 添加录音启动状态跟踪
        
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
        
        this.ttsManager.init();
        console.log('TTS管理器初始化完成');
        
        this.bindEvents();
        console.log('事件绑定完成');
        
        // 预申请录音权限
        await this.initializeAudioPermission();
        
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

    async initializeAudioPermission() {
        try {
            console.log('开始检查录音权限状态...');
            
            // 先检查权限状态
            const permissionStatus = await this.audioRecorder.checkPermissionStatus();
            
            if (permissionStatus === 'granted') {
                console.log('录音权限已授权');
                this.showPermissionStatus('🎤 录音权限已就绪，可以开始使用语音翻译', 'success');
                return;
            }
            
            if (permissionStatus === 'denied') {
                console.log('录音权限被拒绝');
                this.showPermissionStatus('⚠️ 录音权限被拒绝，请在浏览器设置中允许麦克风访问', 'error');
                return;
            }
            
            // 权限状态未知，进行权限测试
            await this.audioRecorder.initializeAudio();
            console.log('录音权限测试成功');
            
            // 显示成功提示
            this.showPermissionStatus('🎤 录音权限已获取，可以开始使用语音翻译', 'success');
        } catch (error) {
            console.error('录音权限处理失败:', error);
            
            // 显示权限获取失败的提示
            this.showPermissionStatus('⚠️ 录音权限获取失败，首次录音时会再次申请权限', 'warning');
        }
    }

    showPermissionStatus(message, type) {
        // 创建权限状态提示元素
        const existingStatus = document.getElementById('permissionStatus');
        if (existingStatus) {
            existingStatus.remove();
        }

        const statusDiv = document.createElement('div');
        statusDiv.id = 'permissionStatus';
        statusDiv.className = `permission-status ${type}`;
        statusDiv.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: 10px;">✕</button>
        `;

        // 插入到聊天容器顶部
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.insertBefore(statusDiv, chatContainer.firstChild);
        }

        // 3秒后自动隐藏成功消息
        if (type === 'success') {
            setTimeout(() => {
                if (statusDiv.parentElement) {
                    statusDiv.remove();
                }
            }, 3000);
        }
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
        
        // 录音按钮事件 - 添加长按检测
        const recordBtn = document.getElementById('recordBtn');
        console.log('录音按钮元素:', recordBtn);
        console.log('录音按钮类名:', recordBtn ? recordBtn.className : 'null');
        
        if (recordBtn) {
            // 初始化长按相关变量
            this.longPressTimer = null;
            this.isLongPressing = false;
            this.longPressThreshold = 30; // 30ms长按阈值
            
            // 创建绑定的事件处理函数，确保可以正确移除
            this.boundHandleTouchMove = this.handleTouchMove.bind(this);
            this.boundHandleMouseMove = this.handleTouchMove.bind(this);
            
            // 鼠标事件
            recordBtn.addEventListener('mousedown', this.handleRecordStart.bind(this));
            recordBtn.addEventListener('mouseup', this.handleRecordEnd.bind(this));
            recordBtn.addEventListener('mouseleave', this.handleRecordCancel.bind(this));
            
            // 触摸事件
            recordBtn.addEventListener('touchstart', this.handleRecordStart.bind(this));
            recordBtn.addEventListener('touchend', this.handleRecordEnd.bind(this));
            recordBtn.addEventListener('touchcancel', this.handleRecordCancel.bind(this));
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
        
        // TTS开关按钮事件
        document.getElementById('ttsToggleBtn').addEventListener('click', () => {
            this.ttsManager.toggle();
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
        
        document.getElementById('ttsVoice').addEventListener('change', (e) => {
            this.settingsManager.setTTSVoice(e.target.value);
        });
        
        document.getElementById('ttsSpeed').addEventListener('change', (e) => {
            this.settingsManager.setTTSSpeed(parseFloat(e.target.value));
        });
        
        document.getElementById('whisperPrompt').addEventListener('change', (e) => {
            this.settingsManager.setWhisperPrompt(e.target.checked);
        });
        
        document.getElementById('clearData').addEventListener('click', this.clearAllData.bind(this));
        
        document.getElementById('clearCache').addEventListener('click', this.clearCache.bind(this));
        
        document.getElementById('resetPermission').addEventListener('click', this.resetPermission.bind(this));
        
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

        // 录音浮窗取消按钮事件
        const cancelRecordingBtn = document.getElementById('cancelRecordingBtn');
        if (cancelRecordingBtn) {
            cancelRecordingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('录音浮窗取消按钮被点击');
                this.cancelRecording(e);
            });
        } else {
            console.error('找不到cancelRecordingBtn按钮');
        }
    }

    // 长按检测事件处理方法
    handleRecordStart(e) {
        e.preventDefault();
        
        if (!this.settingsManager.getApiKey()) {
            this.uiManager.showError('请先配置API密钥');
            return;
        }

        // 记录触摸开始位置
        this.recordingStartY = this.getTouchY(e);
        this.isSlideToCancel = false;
        this.isLongPressing = false;

        // 设置长按定时器
        this.longPressTimer = setTimeout(() => {
            this.isLongPressing = true;
            this.startRecording(e);
        }, this.longPressThreshold);

        // 添加视觉反馈 - 按钮按下状态
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.classList.add('pressing');
    }

    handleRecordEnd(e) {
        e.preventDefault();
        
        // 清除长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // 移除按钮按下状态
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.classList.remove('pressing');

        // 如果是长按状态，则停止录音
        if (this.isLongPressing) {
            this.stopRecording(e);
        } else {
            // 短按，显示提示
            this.uiManager.showError('请长按录音按钮开始录音');
        }

        this.isLongPressing = false;
    }

    handleRecordCancel(e) {
        // 清除长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // 移除按钮按下状态
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.classList.remove('pressing');

        // 如果正在录音，则取消录音
        if (this.isLongPressing) {
            this.cancelRecording(e);
        }

        this.isLongPressing = false;
    }

    async startRecording(e) {
        e.preventDefault();
        
        // API密钥检查已在handleRecordStart中进行，这里不需要重复检查

        try {
            this.isRecordingStarting = true; // 设置录音启动状态
            await this.audioRecorder.startRecording();
            this.isRecordingStarting = false; // 录音启动完成
            this.uiManager.showRecordingOverlay();
            
            // 重置为初始状态
            this.uiManager.showSlideToCancelFeedback(false);
            
            // 添加录音状态
            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.add('recording');
            recordBtn.classList.remove('pressing'); // 移除按下状态，添加录音状态
            
            // 如果是键盘录音，添加特殊样式和提示
            if (this.isRecordingWithKeyboard) {
                recordBtn.classList.add('keyboard-recording');
                const recordingStatus = document.querySelector('.recording-status');
                if (recordingStatus) {
                    recordingStatus.textContent = '🔴 录音中... (松开空格发送 | ESC取消)';
                }
            } else {
                // 添加触摸移动监听器
                this.addTouchMoveListeners();
            }
        } catch (error) {
            this.isRecordingStarting = false; // 录音启动失败，重置状态
            this.uiManager.showError('无法访问麦克风，请检查权限设置');
        }
    }

    getTouchY(e) {
        if (e.touches && e.touches.length > 0) {
            return e.touches[0].clientY;
        } else if (e.clientY !== undefined) {
            return e.clientY;
        }
        return 0;
    }

    addTouchMoveListeners() {
        // 添加触摸移动监听器
        document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
        document.addEventListener('mousemove', this.boundHandleMouseMove);
    }

    removeTouchMoveListeners() {
        // 移除触摸移动监听器
        document.removeEventListener('touchmove', this.boundHandleTouchMove);
        document.removeEventListener('mousemove', this.boundHandleMouseMove);
    }

    handleTouchMove(e) {
        if (!this.audioRecorder.isRecording || this.isRecordingWithKeyboard) return;

        const currentY = this.getTouchY(e);
        const deltaY = this.recordingStartY - currentY; // 上滑为正值
        const cancelThreshold = 150; // 上滑150px取消，增加阈值避免误触

        if (deltaY > cancelThreshold && !this.isSlideToCancel) {
            // 触发滑动取消状态
            this.isSlideToCancel = true;
            this.uiManager.showSlideToCancelFeedback(true);
            
            // 添加震动反馈（如果支持）
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        } else if (deltaY <= cancelThreshold && this.isSlideToCancel) {
            // 取消滑动取消状态
            this.isSlideToCancel = false;
            this.uiManager.showSlideToCancelFeedback(false);
        }

        // 更新滑动进度
        const progress = Math.min(deltaY / cancelThreshold, 1);
        this.uiManager.updateSlideProgress(progress);
    }

    async stopRecording(e) {
        e.preventDefault();
        
        // 如果录音正在启动中，等待一小段时间再检查
        if (this.isRecordingStarting) {
            console.log('录音启动中，等待完成...');
            // 等待录音启动完成，最多等待500ms
            let waitCount = 0;
            while (this.isRecordingStarting && waitCount < 50) {
                await new Promise(resolve => setTimeout(resolve, 10));
                waitCount++;
            }
        }
        
        // 检查是否真的在录音，如果不在录音状态则直接返回
        if (!this.audioRecorder.isRecording && !this.isRecordingStarting) {
            console.log('录音未启动或已停止，取消操作');
            this.uiManager.hideRecordingOverlay();
            this.resetRecordingState();
            return;
        }
        
        if (!this.audioRecorder.isRecording) return;

        // 移除触摸监听器
        this.removeTouchMoveListeners();

        // 如果是滑动取消状态，则取消录音
        if (this.isSlideToCancel) {
            this.cancelRecording(e);
            return;
        }

        try {
            const audioBlob = await this.audioRecorder.stopRecording();
            this.uiManager.hideRecordingOverlay();
            
            // 移除录音状态
            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.remove('recording', 'keyboard-recording');
            
            // 重置滑动状态
            this.isSlideToCancel = false;
            
            if (audioBlob && audioBlob.size > 0) {
                // 检查录音时长
                const recordingDuration = (Date.now() - this.audioRecorder.recordingStartTime) / 1000;
                console.log(`录音时长: ${recordingDuration.toFixed(3)}秒`);
                
                if (recordingDuration < 0.5) { // 小于500ms
                    console.log('录音时间太短，已取消处理');
                    this.uiManager.showError('录音时间太短，请重新录制 / 録音時間が短すぎます、再録音してください');
                    return;
                }
                
                await this.processAudio(audioBlob);
            }
        } catch (error) {
            this.uiManager.showError('录音处理失败');
        }
    }

    cancelRecording(e) {
        console.log('取消录音被调用');
        
        // 清除长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        // 如果正在录音，停止录音
        if (this.audioRecorder.isRecording) {
            this.audioRecorder.cancelRecording();
        }
        
        // 隐藏录音浮窗
        this.uiManager.hideRecordingOverlay();
        
        // 重置所有录音相关状态
        this.resetRecordingState();
        this.isSpacePressed = false;
        this.isRecordingWithKeyboard = false;
        
        // 显示取消提示
        this.uiManager.showSuccess('录音已取消');
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
            
            // 获取上下文用于Whisper prompt
            const context = this.chatManager.getContext();
            
            // 语音转文字（传入上下文）
            const transcription = await this.apiService.transcribeAudio(audioBlob, context);
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
            
            // 播放TTS（如果启用）
            await this.ttsManager.playText(translation);
            
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

    async clearCache() {
        if (confirm('确定要清理本地缓存吗？这将清空所有聊天记录，但保留您的设置信息。')) {
            await this.chatManager.clearAll();
            this.uiManager.updateChat([]);
            this.uiManager.hideSettings();
            this.uiManager.showSuccess('本地缓存已清理，聊天记录已清空');
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
            
            // 播放TTS（如果启用）
            await this.ttsManager.playText(translation);
            
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

    async resetPermission() {
        const resetBtn = document.getElementById('resetPermission');
        
        try {
            // 禁用按钮并显示处理中状态
            resetBtn.disabled = true;
            resetBtn.textContent = '重置中...';
            
            // 清除权限缓存
            this.audioRecorder.clearPermissionCache();
            
            // 重新检查权限
            await this.initializeAudioPermission();
            
            this.uiManager.showSuccess('录音权限已重置');
        } catch (error) {
            console.error('重置录音权限失败:', error);
            this.uiManager.showError('重置录音权限失败');
        } finally {
            // 恢复按钮状态
            resetBtn.disabled = false;
            resetBtn.textContent = '重新申请录音权限';
        }
    }

    async playMessageTTS(text) {
        if (!text || text.trim() === '') {
            return;
        }

        if (!this.settingsManager.getApiKey()) {
            this.uiManager.showError('请先配置API密钥');
            return;
        }

        try {
            // 找到对应的播放按钮
            const playButtons = document.querySelectorAll('.play-tts-btn');
            let targetButton = null;
            
            playButtons.forEach(btn => {
                const btnText = btn.getAttribute('onclick').match(/'([^']+)'/);
                if (btnText && btnText[1] === text.replace(/&#39;/g, "'").replace(/&quot;/g, '"')) {
                    targetButton = btn;
                }
            });

            // 重置所有按钮状态
            playButtons.forEach(btn => {
                btn.classList.remove('playing', 'loading');
                btn.querySelector('.play-icon').textContent = '🔊';
            });

            // 停止当前播放的TTS
            this.ttsManager.stopCurrentAudio();

            // 直接播放TTS，不检查TTS开关状态
            await this.ttsManager.playTextDirect(text, (state) => {
                if (!targetButton) return;

                switch (state) {
                    case 'loading':
                        targetButton.classList.add('loading');
                        targetButton.querySelector('.play-icon').textContent = '⏳';
                        break;
                    case 'playing':
                        targetButton.classList.remove('loading');
                        targetButton.classList.add('playing');
                        targetButton.querySelector('.play-icon').textContent = '🎵';
                        break;
                    case 'ended':
                    case 'error':
                        targetButton.classList.remove('playing', 'loading');
                        targetButton.querySelector('.play-icon').textContent = '🔊';
                        break;
                }
            });

        } catch (error) {
            console.error('播放TTS失败:', error);
            
            // 恢复所有按钮状态
            const playButtons = document.querySelectorAll('.play-tts-btn');
            playButtons.forEach(btn => {
                btn.classList.remove('playing', 'loading');
                btn.querySelector('.play-icon').textContent = '🔊';
            });
        }
    }

    resetRecordingState() {
        // 重置所有录音相关状态
        this.isSlideToCancel = false;
        this.isLongPressing = false;
        this.isRecordingStarting = false;
        
        // 重置录音按钮状态
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.classList.remove('recording', 'keyboard-recording', 'pressing');
        }
        
        // 移除触摸监听器
        this.removeTouchMoveListeners();
    }

    // 消息编辑相关方法
    startEdit(messageId) {
        console.log('开始编辑消息:', messageId);
        
        // 找到要编辑的消息
        const message = this.chatManager.getMessageById(messageId);
        if (!message) {
            console.error('找不到要编辑的消息');
            return;
        }

        // 设置编辑状态
        message.isEditing = true;
        message.originalContent = message.content; // 保存原始内容
        
        // 更新UI
        this.uiManager.updateChat(this.chatManager.getMessages());
        
        // 聚焦到编辑输入框
        setTimeout(() => {
            const editInput = document.querySelector('.edit-input');
            if (editInput) {
                editInput.focus();
                editInput.select();
                
                // 添加键盘事件监听
                editInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.confirmEdit(messageId);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.cancelEdit(messageId);
                    }
                });
            }
        }, 100);
    }

    async confirmEdit(messageId) {
        console.log('确认编辑消息:', messageId);
        
        const editInput = document.querySelector('.edit-input');
        if (!editInput) {
            console.error('找不到编辑输入框');
            return;
        }

        const newContent = editInput.value.trim();
        if (!newContent) {
            this.uiManager.showError('消息内容不能为空');
            return;
        }

        const message = this.chatManager.getMessageById(messageId);
        if (!message) {
            console.error('找不到要编辑的消息');
            return;
        }

        try {
            // 更新消息内容
            message.content = newContent;
            message.isEditing = false;
            delete message.originalContent;

            // 删除对应的AI回复（下一条assistant消息）
            this.chatManager.removeSubsequentAssistantMessage(messageId);

            // 更新UI显示编辑后的消息
            this.uiManager.updateChat(this.chatManager.getMessages());

            // 添加AI思考中的消息
            const thinkingMessage = {
                type: 'assistant',
                content: '正在重新翻译...',
                timestamp: new Date(),
                isLoading: true,
                id: Date.now() + Math.random()
            };
            this.chatManager.addMessage(thinkingMessage);
            this.uiManager.updateChat(this.chatManager.getMessages());

            // 重新翻译
            const context = this.chatManager.getContext();
            const translation = await this.apiService.translateText(newContent, context);

            // 移除思考中的消息，添加真正的回复
            this.chatManager.removeLastMessage();
            this.chatManager.addMessage({
                type: 'assistant',
                content: translation,
                timestamp: new Date(),
                id: Date.now() + Math.random()
            });

            // 更新UI
            this.uiManager.updateChat(this.chatManager.getMessages());

            // 播放TTS（如果启用）
            await this.ttsManager.playText(translation);

        } catch (error) {
            console.error('编辑消息失败:', error);
            this.uiManager.showError('重新翻译失败，请重试');
            
            // 移除可能存在的loading消息
            if (this.chatManager.getMessages().length > 0) {
                const lastMessage = this.chatManager.getMessages()[this.chatManager.getMessages().length - 1];
                if (lastMessage.isLoading) {
                    this.chatManager.removeLastMessage();
                    this.uiManager.updateChat(this.chatManager.getMessages());
                }
            }
        }
    }

    cancelEdit(messageId) {
        console.log('取消编辑消息:', messageId);
        
        const message = this.chatManager.getMessageById(messageId);
        if (!message) {
            console.error('找不到要编辑的消息');
            return;
        }

        // 恢复原始内容
        if (message.originalContent) {
            message.content = message.originalContent;
            delete message.originalContent;
        }
        
        // 取消编辑状态
        message.isEditing = false;
        
        // 更新UI
        this.uiManager.updateChat(this.chatManager.getMessages());
    }
}

// 音频录制器类
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.permissionStatus = 'unknown'; // 'granted', 'denied', 'unknown'
        this.lastPermissionCheck = 0;
        this.permissionCacheTime = 5 * 60 * 1000; // 5分钟缓存
        this.recordingStartTime = 0; // 录音开始时间
        this.recordingTimer = null; // 录音计时器
    }

    // 检查权限状态（不申请权限）
    async checkPermissionStatus() {
        const now = Date.now();
        
        // 如果最近检查过且有缓存，直接返回
        if (now - this.lastPermissionCheck < this.permissionCacheTime && this.permissionStatus !== 'unknown') {
            return this.permissionStatus;
        }

        try {
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                this.permissionStatus = permission.state;
                this.lastPermissionCheck = now;
                
                // 监听权限变化
                permission.addEventListener('change', () => {
                    this.permissionStatus = permission.state;
                    this.lastPermissionCheck = Date.now();
                });
                
                return permission.state;
            }
        } catch (e) {
            console.log('权限查询不支持，将在录音时检查');
        }
        
        // 检查localStorage中的权限记录
        const savedPermission = localStorage.getItem('wetalk_mic_permission');
        if (savedPermission) {
            this.permissionStatus = savedPermission;
            return savedPermission;
        }
        
        return 'unknown';
    }

    // 预初始化权限检查（不保持流）
    async initializeAudio() {
        try {
            const permissionStatus = await this.checkPermissionStatus();
            
            if (permissionStatus === 'denied') {
                throw new Error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
            }
            
            if (permissionStatus === 'granted') {
                console.log('麦克风权限已授权');
                return true;
            }
            
            // 如果权限状态未知，进行一次快速权限测试
            console.log('进行权限测试...');
            const testStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                } 
            });
            
            // 立即关闭测试流
            testStream.getTracks().forEach(track => track.stop());
            
            // 记录权限已授权
            this.permissionStatus = 'granted';
            this.lastPermissionCheck = Date.now();
            localStorage.setItem('wetalk_mic_permission', 'granted');
            
            console.log('权限测试成功，已关闭测试流');
            return true;
            
        } catch (error) {
            this.permissionStatus = 'denied';
            localStorage.setItem('wetalk_mic_permission', 'denied');
            console.error('权限测试失败:', error);
            throw new Error('无法访问麦克风，请确保已授权麦克风权限');
        }
    }

    async startRecording() {
        try {
            // 每次录音时获取新的音频流 - 优化音频参数以提升效率
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 8000,  // 降低采样率到8kHz，语音识别足够使用
                    channelCount: 1,   // 单声道，减少文件大小
                    sampleSize: 16     // 16位采样
                } 
            });
            
            // 更新权限状态
            this.permissionStatus = 'granted';
            localStorage.setItem('wetalk_mic_permission', 'granted');
            
            // 优化音频格式选择，优先使用最高效的格式
            let mimeType = '';
            let audioBitsPerSecond = 16000; // 16kbps，适合语音
            
            // 优先选择opus编码的webm格式（最高效）
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) {
                mimeType = 'audio/mp4;codecs=mp4a.40.2';
                audioBitsPerSecond = 32000; // MP4需要稍高的比特率
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
                audioBitsPerSecond = 32000;
            }
            
            const options = mimeType ? { 
                mimeType, 
                audioBitsPerSecond 
            } : {};
            
            console.log('使用音频格式:', mimeType, '比特率:', audioBitsPerSecond);
            
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            
            this.audioChunks = [];
            this.isRecording = true;
            this.recordingStartTime = Date.now(); // 记录开始时间
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start();
            
            // 启动录音时间计时器
            this.startRecordingTimer();
            
        } catch (error) {
            // 如果权限被拒绝，更新状态
            if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
                this.permissionStatus = 'denied';
                localStorage.setItem('wetalk_mic_permission', 'denied');
            }
            
            console.error('录音启动失败:', error);
            throw new Error('无法开始录音，请检查麦克风权限');
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
                
                // 计算录音时长并记录
                const recordingDuration = (Date.now() - this.recordingStartTime) / 1000;
                console.log(`录音完成，时长: ${recordingDuration.toFixed(1)}秒，文件大小: ${(audioBlob.size / 1024).toFixed(1)}KB`);
                
                this.cleanup(); // 立即清理资源
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    cancelRecording() {
        if (this.isRecording && this.mediaRecorder) {
            this.mediaRecorder.stop();
        }
        this.cleanup(); // 立即清理资源
    }

    cleanup() {
        this.isRecording = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stopRecordingTimer(); // 停止计时器
    }

    // 启动录音计时器
    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            if (this.isRecording) {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                this.updateRecordingTime(elapsed);
            }
        }, 100); // 每100ms更新一次
    }

    // 停止录音计时器
    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    // 更新录音时间显示
    updateRecordingTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // 更新UI显示
        const recordingStatus = document.querySelector('.recording-status');
        if (recordingStatus) {
            recordingStatus.textContent = `🔴 录音中... ${timeString}`;
        }
    }

    // 检查是否有权限（基于缓存状态）
    hasPermission() {
        return this.permissionStatus === 'granted';
    }

    // 清除权限缓存（用于重置）
    clearPermissionCache() {
        this.permissionStatus = 'unknown';
        this.lastPermissionCheck = 0;
        localStorage.removeItem('wetalk_mic_permission');
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

    async transcribeAudio(audioBlob, context = []) {
        const apiKey = this.settingsManager.getApiKey();
        if (!apiKey) {
            throw new Error('请先配置API密钥');
        }

        // 检查音频文件大小 (OpenAI限制25MB)
        if (audioBlob.size > 25 * 1024 * 1024) {
            throw new Error('音频文件过大，请录制较短的音频');
        }

        if (audioBlob.size < 3000) {
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

        // 生成智能prompt
        const prompt = this.generateWhisperPrompt(context);

        const formData = new FormData();
        formData.append('file', audioBlob, fileName);
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'json');
        formData.append('temperature', '0.2');
        
        // 添加prompt参数
        if (prompt) {
            formData.append('prompt', prompt);
        }

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

    // 生成智能Whisper prompt
    generateWhisperPrompt(context) {
        // 检查是否启用了智能prompt
        if (!this.settingsManager.getWhisperPrompt()) {
            return null;
        }

        // 基础词汇库
        const commonTerms = {
            chinese: [
                // 日本地名
                '东京', '大阪', '京都', '名古屋', '横滨', '神户', '福冈', '札幌', '仙台', '广岛',
                '奈良', '镰仓', '箱根', '富士山', '白滨', '银座', '涩谷', '新宿', '原宿', '浅草',
                '上野', '池袋', '秋叶原', '表参道', '六本木', '台场', '迪士尼', '环球影城',
                // 交通相关
                'JR', '新干线', '地铁', '电车', '巴士', '出租车', '机场', '车站', '换乘',
                '山手线', '中央线', '东海道线', '京急线', '小田急线', '京王线',
                // 常用词汇
                '日元', '便利店', '药妆店', '百货店', '温泉', '料理', '拉面', '寿司', '天妇罗',
                '居酒屋', '定食', '便当', '抹茶', '和服', '旅馆', '民宿', '预约', '免税'
            ],
            japanese: [
                // 中国地名
                '北京', '上海', '広州', '深圳', '杭州', '南京', '西安', '成都', '重慶', '天津',
                '青島', '大連', '蘇州', '無錫', '厦門', '福州', '長沙', '武漢', '鄭州', '瀋陽',
                // 交通相关
                '地下鉄', '高速鉄道', '新幹線', 'タクシー', 'バス', '空港', '駅', '乗り換え',
                // 常用词汇
                '人民元', 'コンビニ', 'デパート', '温泉', '料理', 'ラーメン', '寿司', '天ぷら',
                '居酒屋', '定食', '弁当', '抹茶', '着物', '旅館', '民宿', '予約', '免税'
            ]
        };

        // 分析上下文确定主要语言
        const contextText = context.map(msg => msg.content).join(' ');
        const chineseCount = (contextText.match(/[\u4e00-\u9fff]/g) || []).length;
        const japaneseCount = (contextText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
        
        let primaryLanguage = 'mixed';
        if (chineseCount > japaneseCount * 1.5) {
            primaryLanguage = 'chinese';
        } else if (japaneseCount > chineseCount * 1.5) {
            primaryLanguage = 'japanese';
        }

        // 从上下文中提取关键词
        const contextKeywords = this.extractContextKeywords(context);

        // 构建prompt
        let promptParts = [];

        // 1. 上下文关键词
        if (contextKeywords.length > 0) {
            promptParts.push(...contextKeywords.slice(0, 10)); // 限制数量避免prompt过长
        }

        // 2. 根据主要语言添加常用词汇
        if (primaryLanguage === 'chinese') {
            promptParts.push(...commonTerms.chinese.slice(0, 20));
        } else if (primaryLanguage === 'japanese') {
            promptParts.push(...commonTerms.japanese.slice(0, 20));
        } else {
            // 混合语言，添加两种语言的高频词汇
            promptParts.push(...commonTerms.chinese.slice(0, 10));
            promptParts.push(...commonTerms.japanese.slice(0, 10));
        }

        // 3. 添加场景相关词汇
        const sceneKeywords = this.getSceneKeywords(contextText);
        promptParts.push(...sceneKeywords);

        // 去重并限制长度
        const uniqueTerms = [...new Set(promptParts)];
        const prompt = uniqueTerms.slice(0, 30).join('、'); // 限制在30个词以内

        // Whisper prompt不能超过244个tokens，这里简单按字符数限制
        return prompt.length > 200 ? prompt.substring(0, 200) : prompt;
    }

    // 从上下文中提取关键词
    extractContextKeywords(context) {
        const keywords = [];
        const recentMessages = context.slice(-5); // 只看最近5条消息

        recentMessages.forEach(msg => {
            const content = msg.content;
            
            // 提取地名（简单的正则匹配）
            const places = content.match(/[东西南北]?[京都市区县町村]|[一-龟]+[市区县町村站]|[ァ-ヶー]+[駅市区]/g) || [];
            keywords.push(...places);

            // 提取交通相关词汇
            const transport = content.match(/JR|新干线|地铁|电车|巴士|出租车|机场|车站|换乘|[一-龟]+线/g) || [];
            keywords.push(...transport);

            // 提取数字和时间
            const numbers = content.match(/\d+[点时分号月日年円元]/g) || [];
            keywords.push(...numbers);
        });

        return keywords.filter(k => k.length > 1); // 过滤掉单字符
    }

    // 根据对话内容获取场景相关词汇
    getSceneKeywords(contextText) {
        const keywords = [];

        // 旅游场景
        if (/旅游|旅行|観光|ホテル|旅館|民宿/.test(contextText)) {
            keywords.push('観光', '旅行', 'ホテル', '旅館', '民宿', '予約', '観光地', 'ガイド');
        }

        // 购物场景
        if (/购物|買い物|ショッピング|百货|デパート/.test(contextText)) {
            keywords.push('買い物', 'ショッピング', 'デパート', '免税', '割引', 'セール');
        }

        // 餐饮场景
        if (/吃饭|料理|レストラン|食事/.test(contextText)) {
            keywords.push('料理', 'レストラン', '食事', '予約', 'メニュー', '美味しい');
        }

        // 交通场景
        if (/坐车|乘车|電車|バス|タクシー/.test(contextText)) {
            keywords.push('電車', 'バス', 'タクシー', '乗り換え', '切符', '運賃');
        }

        return keywords;
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
4. 只返回翻译结果，不要加额外说明

对话历史：
${contextText}

当前输入：${text}

翻译结果：`;
    }

    async convertToMp3(audioBlob) {
        // 简单的格式转换，实际项目中可能需要更复杂的音频处理
        return audioBlob;
    }

    async textToSpeech(text, voice = 'alloy', speed = 1.0) {
        const apiKey = this.settingsManager.getApiKey();
        if (!apiKey) {
            throw new Error('请先配置API密钥');
        }

        return await this.errorHandler.withRetry(async () => {
            const response = await fetch(`${this.baseURL}/audio/speech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: voice,
                    speed: speed,
                    response_format: 'mp3'
                })
            });

            if (!response.ok) {
                let errorMessage = `TTS API错误: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.message) {
                        errorMessage = `TTS API错误: ${errorData.error.message}`;
                    }
                } catch (e) {
                    // 如果无法解析错误响应，使用默认错误消息
                }
                throw new Error(errorMessage);
            }

            return await response.blob();
        });
    }
}

// TTS管理类
class TTSManager {
    constructor(apiService, settingsManager) {
        this.apiService = apiService;
        this.settingsManager = settingsManager;
        this.isEnabled = false;
        this.currentAudio = null;
        this.isPlaying = false;
    }

    init() {
        // 从localStorage加载TTS设置，默认为false（不自动播放）
        const savedTTSEnabled = localStorage.getItem('wetalk_tts_enabled');
        this.isEnabled = savedTTSEnabled === 'true';
        
        this.updateToggleButton();
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        localStorage.setItem('wetalk_tts_enabled', this.isEnabled.toString());
        this.updateToggleButton();
        
        // 如果关闭TTS，停止当前播放
        if (!this.isEnabled && this.isPlaying) {
            this.stopCurrentAudio();
        }
    }

    updateToggleButton() {
        const toggleBtn = document.getElementById('ttsToggleBtn');
        const icon = toggleBtn.querySelector('.tts-icon');
        
        if (this.isEnabled) {
            toggleBtn.classList.add('active');
            icon.textContent = '🔊';
            toggleBtn.title = '语音播放：开启';
        } else {
            toggleBtn.classList.remove('active');
            icon.textContent = '🔇';
            toggleBtn.title = '语音播放：关闭';
        }
    }

    async playText(text, onStateChange = null) {
        if (!this.isEnabled || !text || text.trim() === '') {
            return;
        }

        return await this.playTextDirect(text, onStateChange);
    }

    async playTextDirect(text, onStateChange = null) {
        if (!text || text.trim() === '') {
            return;
        }

        try {
            // 停止当前播放
            this.stopCurrentAudio();

            // 获取TTS设置
            const voice = this.settingsManager.getTTSVoice();
            const speed = this.settingsManager.getTTSSpeed();

            // 显示加载状态
            this.setLoadingState(true);
            if (onStateChange) onStateChange('loading');

            // 调用TTS API
            const audioBlob = await this.apiService.textToSpeech(text, voice, speed);
            
            // 创建音频对象并播放
            const audioUrl = URL.createObjectURL(audioBlob);
            this.currentAudio = new Audio(audioUrl);
            
            this.currentAudio.onloadeddata = () => {
                this.setLoadingState(false);
            };

            this.currentAudio.onplay = () => {
                this.isPlaying = true;
                this.updatePlayingState(true);
                if (onStateChange) onStateChange('playing');
            };

            this.currentAudio.onended = () => {
                this.isPlaying = false;
                this.updatePlayingState(false);
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                if (onStateChange) onStateChange('ended');
            };

            this.currentAudio.onerror = () => {
                this.isPlaying = false;
                this.setLoadingState(false);
                this.updatePlayingState(false);
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                if (onStateChange) onStateChange('error');
                console.error('音频播放失败');
            };

            await this.currentAudio.play();

        } catch (error) {
            this.setLoadingState(false);
            if (onStateChange) onStateChange('error');
            console.error('TTS播放失败:', error);
            // 不显示错误提示，避免干扰用户体验
        }
    }

    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            this.isPlaying = false;
            this.updatePlayingState(false);
        }
    }

    setLoadingState(isLoading) {
        const toggleBtn = document.getElementById('ttsToggleBtn');
        const icon = toggleBtn.querySelector('.tts-icon');
        
        if (isLoading) {
            toggleBtn.classList.add('disabled');
            icon.textContent = '⏳';
        } else {
            toggleBtn.classList.remove('disabled');
            this.updateToggleButton();
        }
    }

    updatePlayingState(isPlaying) {
        const toggleBtn = document.getElementById('ttsToggleBtn');
        const icon = toggleBtn.querySelector('.tts-icon');
        
        if (isPlaying && this.isEnabled) {
            icon.textContent = '🎵';
        } else {
            this.updateToggleButton();
        }
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

    getMessageById(id) {
        return this.conversations.find(message => message.id === id);
    }

    removeSubsequentAssistantMessage(userMessageId) {
        // 找到用户消息的索引
        const userMessageIndex = this.conversations.findIndex(message => message.id === userMessageId);
        if (userMessageIndex === -1) return;

        // 找到该用户消息后的第一个assistant消息并删除
        for (let i = userMessageIndex + 1; i < this.conversations.length; i++) {
            if (this.conversations[i].type === 'assistant') {
                console.log('删除AI回复消息:', this.conversations[i].id);
                this.conversations.splice(i, 1);
                break;
            }
        }
    }
}

// 设置管理类
class SettingsManager {
    constructor() {
        this.storageKey = 'wetalk_settings';
        this.settings = {
            apiKey: '',
            language: 'auto',
            ttsVoice: 'alloy',
            ttsSpeed: 1.0,
            whisperPrompt: true // 默认启用智能prompt
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
        const ttsVoiceSelect = document.getElementById('ttsVoice');
        const ttsSpeedSelect = document.getElementById('ttsSpeed');
        const whisperPromptCheckbox = document.getElementById('whisperPrompt');
        
        if (apiKeyInput) apiKeyInput.value = this.settings.apiKey;
        if (languageSelect) languageSelect.value = this.settings.language;
        if (ttsVoiceSelect) ttsVoiceSelect.value = this.settings.ttsVoice;
        if (ttsSpeedSelect) ttsSpeedSelect.value = this.settings.ttsSpeed;
        if (whisperPromptCheckbox) whisperPromptCheckbox.checked = this.settings.whisperPrompt;
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

    getTTSVoice() {
        return this.settings.ttsVoice;
    }

    setTTSVoice(ttsVoice) {
        this.settings.ttsVoice = ttsVoice;
        this.saveSettings();
    }

    getTTSSpeed() {
        return this.settings.ttsSpeed;
    }

    setTTSSpeed(ttsSpeed) {
        this.settings.ttsSpeed = ttsSpeed;
        this.saveSettings();
    }

    getWhisperPrompt() {
        return this.settings.whisperPrompt;
    }

    setWhisperPrompt(enabled) {
        this.settings.whisperPrompt = enabled;
        this.saveSettings();
    }

    clearAll() {
        this.settings = {
            apiKey: '',
            language: 'auto',
            ttsVoice: 'alloy',
            ttsSpeed: 1.0,
            whisperPrompt: true
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
        
        // 找到最新的用户消息ID
        const latestUserMessageId = [...messages].reverse().find(msg => msg.type === 'user' && !msg.isLoading)?.id;

        messages.forEach(message => {
            const messageTime = new Date(message.timestamp);
            const timeGroup = this.getTimeGroup(messageTime);

            // 如果时间分组发生变化，添加时间分隔符
            if (timeGroup !== lastTimeGroup) {
                const timeDivider = this.createTimeDivider(timeGroup);
                container.appendChild(timeDivider);
                lastTimeGroup = timeGroup;
            }

            // 判断是否为最新用户消息
            const isLatestUser = message.id === latestUserMessageId;
            
            // 添加消息
            const messageElement = this.createMessageElement(message, isLatestUser);
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

    createMessageElement(message, isLatestUser = false) {
        const div = document.createElement('div');
        div.className = `message ${message.type}`;
        div.setAttribute('data-message-id', message.id);
        
        if (message.isLoading) {
            div.classList.add('loading');
        }

        if (message.isEditing) {
            div.classList.add('editing');
        }

        let content;
        if (message.isEditing) {
            // 编辑模式：显示输入框
            content = `
                <div class="edit-container">
                    <input type="text" class="edit-input" value="${this.escapeForAttribute(message.content)}" />
                    <div class="edit-actions">
                        <button class="edit-confirm-btn" onclick="window.weTalk.confirmEdit('${message.id}')">✓</button>
                        <button class="edit-cancel-btn" onclick="window.weTalk.cancelEdit('${message.id}')">✕</button>
                    </div>
                </div>
            `;
        } else if (message.isLoading) {
            if (message.type === 'user') {
                content = `<span class="loading-dots">正在识别语音<span class="dots">...</span></span>`;
            } else {
                content = `<span class="loading-dots">正在翻译<span class="dots">...</span></span>`;
            }
        } else {
            content = this.escapeHtml(message.content);
        }

        // 构建消息操作按钮
        let actionButtons = '';
        
        // 为assistant消息添加播放按钮
        if (message.type === 'assistant' && !message.isLoading && !message.isEditing && message.content && message.content.trim()) {
            actionButtons += `
                <button class="play-tts-btn" onclick="window.weTalk.playMessageTTS('${this.escapeForAttribute(message.content)}')" title="播放语音">
                    <span class="play-icon">🔊</span>
                </button>
            `;
        }
        
        // 为最新的用户消息添加编辑按钮
        if (message.type === 'user' && isLatestUser && !message.isLoading && !message.isEditing) {
            actionButtons += `
                <button class="edit-message-btn" onclick="window.weTalk.startEdit('${message.id}')" title="编辑消息">
                    <span class="edit-icon">✏️</span>
                </button>
            `;
        }

        const actionsHtml = actionButtons ? `<div class="message-actions">${actionButtons}</div>` : '';

        div.innerHTML = `
            <div class="message-content">${content}</div>
            ${actionsHtml}
        `;

        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeForAttribute(text) {
        return text.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/\n/g, ' ').replace(/\r/g, '');
    }

    showRecordingOverlay() {
        this.elements.recordingOverlay.classList.remove('hidden');
    }

    hideRecordingOverlay() {
        this.elements.recordingOverlay.classList.add('hidden');
        
        // 重置录音提示文字为初始状态
        const recordingHint = this.elements.recordingOverlay.querySelector('.recording-hint');
        if (recordingHint) {
            recordingHint.innerHTML = '释放发送 | 上滑取消<br>離すと送信 | 上にスライドでキャンセル';
            recordingHint.style.color = 'rgba(255, 255, 255, 0.7)';
            recordingHint.style.fontSize = '0.85rem';
            recordingHint.style.fontWeight = '400';
        }
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

    showSlideToCancelFeedback(isActive) {
        const recordingOverlay = this.elements.recordingOverlay;
        if (!recordingOverlay) return;

        // 删除可能存在的浮层
        const existingFeedback = document.getElementById('slideToCancelFeedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // 只更新录音提示文字
        const recordingHint = recordingOverlay.querySelector('.recording-hint');
        if (recordingHint) {
            if (isActive) {
                recordingHint.innerHTML = '❌ 松开取消录音<br>❌ 離すとキャンセル';
                recordingHint.style.color = '#FF3B30';
                recordingHint.style.fontSize = '1rem';
                recordingHint.style.fontWeight = '600';
            } else {
                recordingHint.innerHTML = '释放发送 | 上滑取消<br>離すと送信 | 上にスライドでキャンセル';
                recordingHint.style.color = 'rgba(255, 255, 255, 0.7)';
                recordingHint.style.fontSize = '0.85rem';
                recordingHint.style.fontWeight = '400';
            }
        }
    }

    updateSlideProgress(progress) {
        // 不再需要进度条，保留空方法避免错误
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