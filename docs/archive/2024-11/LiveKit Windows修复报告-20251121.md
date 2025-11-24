# LiveKit Windows Docker 修复报告

## 📅 修复时间
2025-11-21

## ❌ 问题描述

### 症状
创建直播间时报错：
```
Failed to load resource: the server responded with a status of 400 (Bad Request)
```

服务器日志显示：
```
Create live session error: TypeError: fetch failed
[cause]: AggregateError [ECONNREFUSED]
```

### 根本原因

**Windows Docker Desktop 不支持 `host` 网络模式！**

之前的配置使用了 Linux 的 `network_mode: "host"`，但在 Windows 上：
- Docker Desktop 运行在 Linux 虚拟机中
- `host` 模式会被忽略或回退到 bridge 模式
- 端口不会映射到 Windows 宿主机
- Next.js 无法访问 LiveKit API

验证方式：
```bash
# 修复前：netstat 找不到端口
netstat -ano | findstr :7880
# 返回：无结果（端口不可访问）

# 修复后：端口正常监听
netstat -ano | findstr :7880
# 返回：
TCP    0.0.0.0:7880           0.0.0.0:0              LISTENING       23988
```

## ✅ 解决方案

### 修复 1: Docker Compose 配置

**文件**: [docker-compose.livekit.yml](docker-compose.livekit.yml)

**修改前**:
```yaml
services:
  livekit:
    command: --config /etc/livekit.yaml --node-ip 127.0.0.1
    network_mode: "host"  # ❌ Windows 不支持
```

**修改后**:
```yaml
services:
  livekit:
    command: --config /etc/livekit.yaml
    ports:  # ✅ 使用端口映射
      - "7880:7880"      # HTTP/WebSocket
      - "7881:7881"      # RTC TCP
      - "7882:7882/udp"  # RTC UDP
      - "50000-50099:50000-50099/udp"  # WebRTC 端口范围
```

### 修复 2: LiveKit 配置

**文件**: [livekit.yaml](livekit.yaml)

**修改前**:
```yaml
rtc:
  port_range_start: 50000
  port_range_end: 60000
  node_ip: "127.0.0.1"  # ❌ Docker 容器内不适用
```

**修改后**:
```yaml
rtc:
  port_range_start: 50000
  port_range_end: 50099    # ✅ 匹配端口映射范围
  use_external_ip: false
  tcp_port: 7881
  udp_port: 7882
```

### 修复 3: 环境变量

**文件**: [.env.local](.env.local)

**修改前**:
```env
LIVEKIT_URL=ws://localhost:7880  # ❌ WebSocket URL 用于客户端
```

**修改后**:
```env
LIVEKIT_URL=http://localhost:7880  # ✅ HTTP URL 用于服务端 SDK
```

**重要说明**：
- `ws://` 是客户端浏览器连接用的 WebSocket URL
- `http://` 是服务端 SDK (`RoomServiceClient`) 用的 HTTP API URL
- 混用会导致 `ECONNREFUSED` 错误

## 🔧 技术细节

### Windows Docker 网络模式对比

| 模式 | Linux | Windows Docker Desktop |
|------|-------|----------------------|
| `host` | ✅ 直接使用宿主机网络 | ❌ 不支持/被忽略 |
| `bridge` + 端口映射 | ✅ 支持 | ✅ 支持 |

**为什么 Windows 不支持 `host` 模式？**

Windows Docker Desktop 架构：
```
Windows 宿主机
  └─ Hyper-V/WSL2 虚拟机 (Linux)
      └─ Docker 容器
```

- Docker 实际运行在 Linux VM 中
- `host` 模式只是容器使用 VM 的网络
- 端口仍然在 VM 内部，无法直接访问
- 必须通过端口映射才能暴露到 Windows

### LiveKit URL 说明

LiveKit 有两种连接方式：

1. **服务端 SDK (Node.js)**:
   ```typescript
   // 使用 HTTP URL
   const client = new RoomServiceClient(
     "http://localhost:7880",  // ✅ HTTP
     apiKey,
     apiSecret
   );
   ```

2. **客户端 SDK (浏览器)**:
   ```typescript
   // 使用 WebSocket URL
   const room = new Room();
   await room.connect(
     "ws://localhost:7880",  // ✅ WebSocket
     token
   );
   ```

**混用会导致错误**：
- 服务端用 `ws://` → `ECONNREFUSED` (WebSocket 不支持 HTTP API)
- 客户端用 `http://` → 连接失败 (HTTP 不支持实时通信)

## 🧪 测试验证

### 1. 验证 LiveKit 运行

```bash
# 查看容器状态
docker ps | findstr livekit
# 应该显示 "Up" 状态

# 查看日志
docker logs livekit_server
# 应该显示：
# INFO starting LiveKit server {"portHttp": 7880, ...}
```

### 2. 验证端口映射

```bash
# 检查端口
netstat -ano | findstr :7880
netstat -ano | findstr :7881

# 测试 HTTP 连接
curl http://localhost:7880
# 应该返回 200 状态码
```

### 3. 测试创建直播间

1. 访问 http://localhost:3002/live/new
2. 填写课堂信息
3. 点击"创建课堂"
4. **应该成功创建**，不再出现 400 错误

## 📊 修复前后对比

### 修复前
```
❌ Docker: host 网络模式（Windows 不支持）
❌ 端口: 无法从 Windows 访问
❌ LiveKit URL: ws://localhost:7880 (错误)
❌ Next.js: ECONNREFUSED 连接失败
❌ 直播间: 创建失败 (400 错误)
```

### 修复后
```
✅ Docker: 端口映射模式（Windows 兼容）
✅ 端口: 正常监听 7880, 7881, 7882
✅ LiveKit URL: http://localhost:7880 (正确)
✅ Next.js: 成功连接 LiveKit API
✅ 直播间: 可以正常创建
```

## 🎯 关键改进

### 1. 跨平台兼容
- **前**: 仅适用于 Linux
- **后**: Windows/Linux/Mac 通用

### 2. 网络配置
- **前**: 依赖 `host` 模式
- **后**: 标准端口映射

### 3. URL 配置
- **前**: WebSocket URL (错误)
- **后**: HTTP URL (正确)

## ⚠️ 注意事项

### 1. 端口范围

当前配置限制 WebRTC 端口范围为 `50000-50099` (100个端口)：

```yaml
ports:
  - "50000-50099:50000-50099/udp"
```

**适用场景**：
- ✅ 本地开发（几个用户）
- ✅ 小规模测试
- ❌ 大规模生产环境

**如果需要支持更多并发用户**：
```yaml
# 增加端口范围（需要更多系统资源）
ports:
  - "50000-50499:50000-50499/udp"  # 500个端口
```

### 2. 防火墙配置

确保 Windows 防火墙允许以下端口：
- `7880/tcp` - HTTP API
- `7881/tcp` - RTC TCP
- `7882/udp` - RTC UDP
- `50000-50099/udp` - WebRTC

### 3. 生产环境

**本配置仅适用于本地开发！**

生产环境需要：
- ✅ 使用公网 IP
- ✅ 配置 TURN 服务器（NAT 穿透）
- ✅ 启用 HTTPS/WSS
- ✅ 负载均衡
- ✅ 考虑使用 LiveKit Cloud

### 4. Mac 用户

Mac Docker Desktop 也有类似限制：
- `host` 模式有限制
- 建议也使用端口映射
- 配置与 Windows 相同

## 📝 修改文件清单

1. ✅ [docker-compose.livekit.yml](docker-compose.livekit.yml) - 端口映射配置
2. ✅ [livekit.yaml](livekit.yaml) - LiveKit 服务器配置
3. ✅ [.env.local](.env.local) - 环境变量 (HTTP URL)

## 🚀 部署步骤

如果你在其他 Windows 机器上部署：

```bash
# 1. 停止旧容器
docker-compose -f docker-compose.livekit.yml down

# 2. 更新配置文件（使用本报告中的配置）

# 3. 启动新容器
docker-compose -f docker-compose.livekit.yml up -d

# 4. 验证端口
netstat -ano | findstr :7880

# 5. 更新 .env.local (使用 http://)

# 6. 重启 Next.js
npm run dev
```

## 📚 参考资料

- [LiveKit Self-Hosting Guide](https://docs.livekit.io/realtime/self-hosting/)
- [Docker Windows Networking](https://docs.docker.com/desktop/networking/)
- [LiveKit Server SDK](https://docs.livekit.io/realtime/server/sdks/)
- [Why host networking doesn't work on Windows](https://docs.docker.com/network/drivers/host/)

## ✅ 总结

| 问题 | 状态 | 解决方案 |
|------|------|----------|
| Windows `host` 网络不支持 | ✅ 已修复 | 改用端口映射 |
| 端口无法访问 | ✅ 已修复 | 正确配置端口映射 |
| LiveKit URL 错误 | ✅ 已修复 | HTTP URL (非 WebSocket) |
| 直播间创建失败 | ✅ 已修复 | 修复连接问题 |
| 跨平台兼容性 | ✅ 已改进 | Windows/Linux/Mac 通用 |

**现在可以在 Windows 上正常使用直播功能了！** 🎉
