# WeTalk - 中日语音翻译助手

一个基于PWA技术的中日双向语音翻译工具，专为赴日旅游用户设计。

## ✨ 特性

- 🎤 **语音录制** - 长按录音，类似微信语音消息
- 🔄 **智能翻译** - 中日双向翻译，支持上下文理解
- 💬 **对话历史** - 本地存储对话记录
- 📱 **PWA支持** - 可安装到手机桌面，离线使用
- 🔒 **隐私保护** - API密钥本地存储，不上传服务器
- 🌐 **跨平台** - 支持iOS、Android、桌面浏览器

## 🚀 快速开始

### 1. 获取OpenAI API密钥

1. 访问 [OpenAI官网](https://platform.openai.com/)
2. 注册账号并获取API密钥
3. 确保账户有足够余额

### 2. 部署应用

#### 方式一：本地运行
```bash
# 克隆项目
git clone <repository-url>
cd WeTalk

# 启动本地服务器
python -m http.server 8000
# 或使用Node.js
npx serve .

# 访问 http://localhost:8000
```

#### 方式二：部署到Netlify
1. Fork本项目到GitHub
2. 在Netlify中连接GitHub仓库
3. 自动部署完成

#### 方式三：部署到Vercel
```bash
npm install -g vercel
vercel --prod
```

### 3. 配置API密钥

1. 打开应用
2. 点击设置按钮（⚙️）
3. 输入OpenAI API密钥
4. 保存设置

### 4. 开始使用

1. 长按麦克风按钮开始录音
2. 说出中文或日文
3. 释放按钮获取翻译结果
4. 点击复制按钮复制翻译内容

## 📱 安装到手机

### iOS Safari
1. 打开应用网址
2. 点击分享按钮
3. 选择"添加到主屏幕"

### Android Chrome
1. 打开应用网址
2. 点击菜单按钮
3. 选择"安装应用"

## 🛠 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **PWA**: Service Worker + Web App Manifest
- **音频**: MediaRecorder API
- **存储**: IndexedDB + LocalStorage
- **API**: OpenAI Whisper + GPT-4o mini

## 📊 成本估算

### 个人使用（每天10次对话）
- **Whisper API**: ~6.5元/月
- **GPT-4o mini**: ~0.3元/月
- **总计**: ~7元/月

### 部署成本
- **托管**: 免费（Netlify/Vercel）
- **域名**: 可选，~100元/年
- **HTTPS**: 免费（自动配置）

## 🔧 开发

### 项目结构
```
WeTalk/
├── index.html          # 主页面
├── manifest.json       # PWA配置
├── sw.js              # Service Worker
├── styles/
│   └── main.css       # 样式文件
├── scripts/
│   └── app.js         # 主应用逻辑
├── icons/             # 应用图标
└── README.md          # 项目说明
```

### 本地开发
```bash
# 启动开发服务器
python -m http.server 8000

# 或使用Live Server扩展（推荐）
```

### 调试
- 打开浏览器开发者工具
- 查看Console面板获取日志
- 使用Application面板调试PWA功能

## 🔒 隐私说明

- API密钥仅存储在用户设备本地
- 对话记录仅保存在本地IndexedDB
- 音频文件仅临时处理，不会保存
- 不收集任何用户个人信息

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请提交Issue或联系开发者。

---

**注意**: 使用前请确保已配置有效的OpenAI API密钥。 