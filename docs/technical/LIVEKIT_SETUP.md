# LiveKit 本地服务器设置指南

本文档说明如何在本地运行LiveKit服务器，用于测试直播功能。

---

## 🚀 快速开始

### 方案A：使用Docker（推荐）

**1. 创建docker-compose.yml文件**

在项目根目录创建 `docker-compose.livekit.yml`：

```yaml
version: '3.8'

services:
  livekit:
    image: livekit/livekit-server:latest
    command: --dev
    ports:
      - "7880:7880"    # WebRTC
      - "7881:7881"    # HTTP API
      - "7882:7882/udp" # TURN/UDP
    environment:
      LIVEKIT_KEYS: "devkey: secret"
      LIVEKIT_LOG_LEVEL: "info"
    volumes:
      - ./livekit-data:/livekit
```

**2. 启动LiveKit服务器**

```bash
docker-compose -f docker-compose.livekit.yml up -d
```

**3. 验证服务器运行**

```bash
# 查看日志
docker-compose -f docker-compose.livekit.yml logs -f

# 检查服务状态
curl http://localhost:7881
```

**4. 停止服务器**

```bash
docker-compose -f docker-compose.livekit.yml down
```

---

### 方案B：使用LiveKit CLI

**1. 安装LiveKit CLI**

```bash
# macOS
brew install livekit

# Windows (使用 Scoop)
scoop bucket add livekit https://github.com/livekit/scoop-bucket.git
scoop install livekit

# 或直接下载二进制文件
# https://github.com/livekit/livekit/releases
```

**2. 启动开发服务器**

```bash
livekit-server --dev --bind 127.0.0.1
```

---

### 方案C：使用LiveKit Cloud（最简单）

**1. 注册免费账号**

访问 [https://cloud.livekit.io](https://cloud.livekit.io) 注册账号。

**2. 创建项目并获取密钥**

- 创建新项目
- 复制API Key和Secret Key
- 复制WebSocket URL

**3. 更新.env.local**

```env
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## ⚙️ 配置说明

### 环境变量

在 `.env.local` 文件中配置：

```env
# LiveKit 配置
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880

# Provider选择
LIVE_PROVIDER_DEFAULT=livekit
```

### 开发环境默认配置

| 配置项 | 值 | 说明 |
|-------|---|------|
| API Key | `devkey` | 开发环境密钥 |
| API Secret | `secret` | 开发环境密钥 |
| WebSocket URL | `ws://localhost:7880` | 本地服务器地址 |
| HTTP API URL | `http://localhost:7881` | API端点 |

---

## 🧪 测试直播功能

### 1. 启动应用

```bash
npm run dev
```

### 2. 创建直播课堂

1. 以教师身份登录：`teacher@test.com` / `test123456`
2. 访问 http://localhost:3002/live
3. 点击"创建课堂"
4. 填写课堂信息
5. 选择Provider为"LiveKit"
6. 提交创建

### 3. 进入直播

1. 点击"进入课堂"按钮
2. 允许浏览器访问摄像头和麦克风
3. 应该能看到自己的视频画面

### 4. 多人测试

打开另一个浏览器窗口（或无痕模式）：

1. 以学生身份登录：`student@test.com` / `test123456`
2. 访问同一个直播课堂
3. 应该能看到教师和自己的画面

---

## 🔧 故障排查

### 问题1：无法连接到LiveKit服务器

**症状**：页面显示"连接失败"

**解决方案**：

1. 检查LiveKit服务器是否运行：
   ```bash
   curl http://localhost:7881
   ```

2. 检查Docker容器状态：
   ```bash
   docker ps | grep livekit
   ```

3. 查看服务器日志：
   ```bash
   docker logs livekit_server
   ```

### 问题2：无法获取token

**症状**：浏览器控制台显示"获取token失败"

**解决方案**：

1. 检查环境变量配置
2. 检查API Key和Secret是否匹配
3. 查看服务器端日志

### 问题3：无法看到视频

**症状**：进入房间后只看到黑屏

**解决方案**：

1. 检查浏览器是否允许访问摄像头和麦克风
2. 检查HTTPS配置（某些浏览器要求HTTPS才能访问摄像头）
3. 尝试使用`localhost`而不是`127.0.0.1`

### 问题4：Docker启动失败

**症状**：`docker-compose up` 报错

**解决方案**：

1. 确保Docker已安装并运行
2. 检查端口是否被占用：
   ```bash
   # Windows
   netstat -ano | findstr "7880"

   # macOS/Linux
   lsof -i :7880
   ```
3. 尝试更换端口

---

## 📚 LiveKit功能说明

### 已实现功能

✅ **基础音视频**
- 视频流发布和订阅
- 音频流发布和订阅
- 摄像头/麦克风控制
- 多人同时在线

✅ **房间管理**
- 创建直播房间
- 加入/离开房间
- 房间状态管理

✅ **身份验证**
- 基于JWT的token认证
- 教师/学生角色区分
- Token过期管理（2小时）

### 未实现功能（可选）

⏳ **屏幕共享**
- 需要添加屏幕共享按钮
- 使用LiveKit的ScreenShare功能

⏳ **聊天功能**
- 使用LiveKit的Data Channel
- 或使用Supabase Realtime

⏳ **白板功能**
- 集成tldraw或Excalidraw
- 使用Yjs实现协作

⏳ **录制和回放**
- 配置LiveKit Egress
- 存储录制文件到S3/OSS
- 创建回放播放器

---

## 🎓 LiveKit资源

- **官方文档**：https://docs.livekit.io
- **React SDK文档**：https://docs.livekit.io/client-sdk-js/
- **示例代码**：https://github.com/livekit/livekit-react
- **服务器文档**：https://docs.livekit.io/home/self-hosting/deployment/

---

## 💡 生产环境部署建议

### 1. 使用LiveKit Cloud

**优点**：
- 无需维护服务器
- 自动扩容
- 全球CDN加速
- 按使用量付费

**缺点**：
- 有成本
- 数据存储在第三方

### 2. 自建LiveKit服务器

**优点**：
- 完全控制
- 数据私有
- 无使用量限制（基础设施成本）

**缺点**：
- 需要运维
- 需要配置TURN服务器
- 需要SSL证书

**最低配置**：
- CPU: 2核
- 内存: 4GB
- 带宽: 100Mbps
- 建议人数: <50人

**推荐配置（100人+）**：
- CPU: 8核
- 内存: 16GB
- 带宽: 1Gbps
- SSD存储: 100GB

---

## 📞 技术支持

如有问题，请查看：

1. [LiveKit文档](https://docs.livekit.io)
2. [LiveKit Discord社区](https://discord.gg/livekit)
3. [项目Issues](https://github.com/livekit/livekit/issues)

---

**设置完成！现在可以测试直播功能了。** 🎉
