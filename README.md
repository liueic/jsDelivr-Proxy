# jsDelivr Proxy Server

一个高性能的 jsDelivr CDN 代理服务器，具有智能缓存功能。

## 功能特性

- 🚀 **高性能代理**: 代理 jsDelivr CDN 请求
- 💾 **智能缓存**: 双层缓存（内存 + 磁盘）
- ⏰ **缓存过期**: 可配置的缓存过期时间
- 📊 **监控统计**: 缓存命中率和状态监控
- 🗜️ **响应压缩**: 自动 gzip 压缩
- 🌐 **CORS 支持**: 跨域资源共享
- 📝 **详细日志**: 请求和错误日志
- 🛡️ **错误处理**: 优雅的错误处理和恢复

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务器

```bash
# 生产环境
npm start

# 开发环境（热重载）
npm run dev
```

服务器默认运行在 `http://localhost:8080`

## 使用方法

### 代理 jsDelivr 资源

将原来的 jsDelivr URL：
```
https://cdn.jsdelivr.net/npm/package@version/file.js
```

替换为：
```
http://localhost:8080/npm/package@version/file.js
```

### 示例

```html
<!-- 原始链接 -->
<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>

<!-- 通过代理 -->
<script src="http://localhost:8080/npm/vue@3/dist/vue.global.js"></script>
```

## API 端点

### 健康检查
```
GET /health
```
返回服务器状态和缓存统计信息。

### 缓存统计
```
GET /cache/stats
```
获取详细的缓存统计信息。

### 清理缓存
```
DELETE /cache/clear
```
清空所有缓存（内存和磁盘）。

## 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `8080` | 服务器端口 |
| `BASE_URL` | `https://cdn.jsdelivr.net` | jsDelivr 基础 URL |
| `CACHE_DIR` | `./cache` | 磁盘缓存目录 |
| `CACHE_TTL` | `86400` | 磁盘缓存过期时间（秒） |
| `MEMORY_CACHE_TTL` | `3600` | 内存缓存过期时间（秒） |
| `MAX_FILE_SIZE` | `10485760` | 最大文件大小（字节，默认10MB） |

### 配置示例

```bash
# .env 文件
PORT=3000
CACHE_DIR=/tmp/jsdelivr-cache
CACHE_TTL=7200
MAX_FILE_SIZE=5242880
```

## Docker 部署

### 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080
CMD ["npm", "start"]
```

### 构建和运行

```bash
docker build -t jsdelivr-proxy .
docker run -p 8080:8080 -v $(pwd)/cache:/app/cache jsdelivr-proxy
```

## 性能优化建议

1. **缓存目录**: 将缓存目录挂载到高速存储（如 SSD）
2. **内存配置**: 根据服务器内存调整 Node.js 堆大小
3. **反向代理**: 使用 Nginx 作为反向代理提供静态文件服务
4. **集群模式**: 使用 PM2 或 cluster 模块实现多进程

## 监控和维护

### 日志监控
服务器输出详细的访问日志，包括：
- 缓存命中/未命中状态
- 请求处理时间
- 错误信息

### 缓存管理
- 定期清理过期缓存文件
- 监控磁盘空间使用情况
- 调整缓存策略以优化性能

## 许可证

MIT License
