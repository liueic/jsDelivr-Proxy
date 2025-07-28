const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const morgan = require('morgan');
const NodeCache = require('node-cache');
const compression = require('compression');
const cors = require('cors');

const app = express();

// 配置选项
const config = {
  PORT: process.env.PORT || 8080,
  BASE_URL: process.env.BASE_URL || 'https://cdn.jsdelivr.net',
  CACHE_DIR: process.env.CACHE_DIR || './cache',
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 24 * 60 * 60, // 24小时（秒）
  MEMORY_CACHE_TTL: parseInt(process.env.MEMORY_CACHE_TTL) || 60 * 60, // 1小时（秒）
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
};

// 内存缓存，用于存储文件元信息
const memoryCache = new NodeCache({ 
  stdTTL: config.MEMORY_CACHE_TTL,
  checkperiod: 600 // 每10分钟检查过期项
});

// 中间件
app.use(compression());
app.use(cors());
app.use(morgan('combined'));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cacheStats: memoryCache.getStats()
  });
});

// 缓存统计端点
app.get('/cache/stats', (req, res) => {
  const stats = memoryCache.getStats();
  res.json({
    memoryCache: stats,
    cacheDir: config.CACHE_DIR,
    cacheTTL: config.CACHE_TTL
  });
});

// 注意：出于安全考虑，不提供公网清空缓存功能
// 如需清空缓存，请在服务器上手动删除缓存目录或重启服务

// 管理面板首页
app.get('/', (req, res) => {
  const dashboardHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>jsDelivr Proxy 管理面板</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #f0f0f0;
        }
        h1 {
            color: #333;
            margin: 0;
            font-size: 2.5em;
            font-weight: 600;
        }
        .subtitle {
            color: #666;
            margin: 10px 0 0 0;
            font-size: 1.2em;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #007bff;
        }
        .info-card h3 {
            margin: 0 0 10px 0;
            color: #007bff;
            font-size: 1.1em;
        }
        .info-card p {
            margin: 5px 0;
            color: #555;
        }
        .test-section {
            margin: 30px 0;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #28a745;
        }
        .test-section h3 {
            margin-top: 0;
            color: #28a745;
            font-size: 1.3em;
        }
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: 500;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .loading {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .api-test {
            display: flex;
            gap: 15px;
            margin: 15px 0;
            align-items: center;
            flex-wrap: wrap;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        button:disabled {
            background: #6c757d;
            cursor: not-allowed;
            transform: none;
        }
        .danger {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%) !important;
        }
        .code {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            margin: 15px 0;
            overflow-x: auto;
            border: 1px solid #e9ecef;
        }
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stats-table th, .stats-table td {
            border: none;
            padding: 12px;
            text-align: left;
        }
        .stats-table th {
            background: #495057;
            color: white;
            font-weight: 600;
        }
        .stats-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .pulse {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 jsDelivr Proxy 管理面板</h1>
            <p class="subtitle">高性能 CDN 代理服务器 - 智能缓存管理</p>
        </div>
        
        <div class="info-grid">
            <div class="info-card">
                <h3>📍 服务地址</h3>
                <p><strong>代理服务：</strong> http://localhost:${config.PORT}</p>
                <p><strong>管理面板：</strong> http://localhost:${config.PORT}/</p>
            </div>
            <div class="info-card">
                <h3>🔗 使用方法</h3>
                <p>将 <code>cdn.jsdelivr.net</code> 替换为</p>
                <p><code>localhost:${config.PORT}</code></p>
            </div>
            <div class="info-card">
                <h3>⚙️ 配置信息</h3>
                <p><strong>缓存目录：</strong> ${config.CACHE_DIR}</p>
                <p><strong>缓存时间：</strong> ${config.CACHE_TTL}秒</p>
                <p><strong>最大文件：</strong> ${(config.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB</p>
            </div>
        </div>

        <div class="test-section">
            <h3>📊 服务器状态监控</h3>
            <div id="server-status" class="status loading pulse">正在检查服务器状态...</div>
            <div class="api-test">
                <button onclick="checkServerStatus()">🔄 刷新状态</button>
                <button onclick="window.open('/health', '_blank')">📋 查看详细状态</button>
            </div>
        </div>

        <div class="test-section">
            <h3>💾 缓存管理</h3>
            <div id="cache-stats" class="status loading pulse">正在获取缓存统计...</div>
            <div class="api-test">
                <button onclick="getCacheStats()">📊 刷新统计</button>
                <button onclick="window.open('/cache/stats', '_blank')">� 详细统计</button>
            </div>
            <p style="color: #666; font-size: 0.9em; margin-top: 15px;">
                � <strong>提示：</strong> 缓存会根据配置的TTL自动过期，无需手动清理
            </p>
        </div>

        <div class="test-section">
            <h3>🧪 资源加载测试</h3>
            <div class="api-test">
                <button onclick="testResource('npm/vue@3/dist/vue.global.min.js')">Vue.js</button>
                <button onclick="testResource('npm/axios@1.5.0/dist/axios.min.js')">Axios</button>
                <button onclick="testResource('npm/lodash@4.17.21/lodash.min.js')">Lodash</button>
                <button onclick="testResource('npm/bootstrap@5.3.0/dist/css/bootstrap.min.css')">Bootstrap CSS</button>
            </div>
            <div id="resource-test" class="status" style="display: none;"></div>
        </div>

        <div class="test-section">
            <h3>⚡ 性能测试</h3>
            <div class="api-test">
                <button onclick="performanceTest()">🏃‍♂️ 运行性能测试</button>
                <button onclick="batchTest()">📦 批量测试</button>
            </div>
            <div id="performance-result" class="status" style="display: none;"></div>
        </div>

        <div class="test-section">
            <h3>📝 使用示例</h3>
            <p>将以下代码中的 URL 替换为代理服务器地址：</p>
            <div class="code">
<!-- 原始 jsDelivr 链接 -->
&lt;script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.min.js"&gt;&lt;/script&gt;
&lt;link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"&gt;

<!-- 通过代理服务器 -->
&lt;script src="http://localhost:${config.PORT}/npm/vue@3/dist/vue.global.min.js"&gt;&lt;/script&gt;
&lt;link rel="stylesheet" href="http://localhost:${config.PORT}/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"&gt;
            </div>
        </div>
    </div>

    <script>
        const baseUrl = window.location.origin;

        async function checkServerStatus() {
            const statusDiv = document.getElementById('server-status');
            statusDiv.className = 'status loading pulse';
            statusDiv.textContent = '正在检查服务器状态...';

            try {
                const response = await fetch(\`\${baseUrl}/health\`);
                const data = await response.json();
                
                if (response.ok) {
                    statusDiv.className = 'status success';
                    statusDiv.innerHTML = \`
                        ✅ <strong>服务器运行正常</strong><br>
                        <strong>状态：</strong> \${data.status}<br>
                        <strong>运行时间：</strong> \${new Date(data.timestamp).toLocaleString()}<br>
                        <strong>内存缓存命中率：</strong> \${(data.cacheStats.hits / (data.cacheStats.hits + data.cacheStats.misses) * 100 || 0).toFixed(2)}%
                    \`;
                } else {
                    throw new Error(\`HTTP \${response.status}\`);
                }
            } catch (error) {
                statusDiv.className = 'status error';
                statusDiv.textContent = \`❌ 服务器连接失败: \${error.message}\`;
            }
        }

        async function getCacheStats() {
            const statsDiv = document.getElementById('cache-stats');
            statsDiv.className = 'status loading pulse';
            statsDiv.textContent = '正在获取缓存统计...';

            try {
                const response = await fetch(\`\${baseUrl}/cache/stats\`);
                const data = await response.json();
                
                if (response.ok) {
                    const { memoryCache } = data;
                    const hitRate = (memoryCache.hits / (memoryCache.hits + memoryCache.misses) * 100 || 0).toFixed(2);
                    
                    statsDiv.className = 'status success';
                    statsDiv.innerHTML = \`
                        <strong>📊 缓存统计信息：</strong><br>
                        <table class="stats-table">
                            <tr><th>统计项目</th><th>数值</th></tr>
                            <tr><td>💾 缓存项数量</td><td>\${memoryCache.keys}</td></tr>
                            <tr><td>🎯 命中次数</td><td>\${memoryCache.hits}</td></tr>
                            <tr><td>❌ 未命中次数</td><td>\${memoryCache.misses}</td></tr>
                            <tr><td>📈 命中率</td><td>\${hitRate}%</td></tr>
                            <tr><td>📁 缓存目录</td><td>\${data.cacheDir}</td></tr>
                            <tr><td>⏰ 缓存TTL</td><td>\${data.cacheTTL}秒 (\${(data.cacheTTL/3600).toFixed(1)}小时)</td></tr>
                        </table>
                    \`;
                } else {
                    throw new Error(\`HTTP \${response.status}\`);
                }
            } catch (error) {
                statsDiv.className = 'status error';
                statsDiv.textContent = \`❌ 获取统计失败: \${error.message}\`;
            }
        }

        async function testResource(path) {
            const testDiv = document.getElementById('resource-test');
            testDiv.style.display = 'block';
            testDiv.className = 'status loading pulse';
            testDiv.textContent = \`正在测试资源: \${path}...\`;

            const startTime = Date.now();
            
            try {
                const response = await fetch(\`\${baseUrl}/\${path}\`);
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                if (response.ok) {
                    const size = response.headers.get('content-length') || '未知';
                    const cacheStatus = response.headers.get('x-cache') || '未知';
                    const contentType = response.headers.get('content-type') || '未知';
                    
                    testDiv.className = 'status success';
                    testDiv.innerHTML = \`
                        ✅ <strong>资源加载成功</strong><br>
                        <strong>📁 文件路径：</strong> \${path}<br>
                        <strong>📏 文件大小：</strong> \${size} 字节<br>
                        <strong>⏱️ 响应时间：</strong> \${duration}ms<br>
                        <strong>💾 缓存状态：</strong> <span style="color: \${cacheStatus === 'HIT' ? 'green' : 'orange'}">\${cacheStatus}</span><br>
                        <strong>📋 内容类型：</strong> \${contentType}
                    \`;
                    
                    // 自动刷新缓存统计
                    setTimeout(getCacheStats, 500);
                } else {
                    throw new Error(\`HTTP \${response.status}\`);
                }
            } catch (error) {
                testDiv.className = 'status error';
                testDiv.textContent = \`❌ 资源加载失败: \${error.message}\`;
            }
        }

        async function performanceTest() {
            const resultDiv = document.getElementById('performance-result');
            resultDiv.style.display = 'block';
            resultDiv.className = 'status loading pulse';
            resultDiv.textContent = '🏃‍♂️ 正在运行性能测试...';

            const testPath = 'npm/vue@3/dist/vue.global.min.js';
            const iterations = 3;
            
            try {
                // 注意：由于安全考虑，不提供清空缓存功能
                // 性能测试将基于当前缓存状态进行

                // 第一次请求（可能命中缓存）
                const firstStart = Date.now();
                const firstResponse = await fetch(\`\${baseUrl}/\${testPath}\`);
                const firstEnd = Date.now();
                const firstTime = firstEnd - firstStart;
                const firstCacheStatus = firstResponse.headers.get('x-cache') || 'UNKNOWN';

                // 等待一下
                await new Promise(resolve => setTimeout(resolve, 500));

                // 后续请求
                const subsequentTimes = [];
                const cacheStatuses = [];
                for (let i = 0; i < iterations; i++) {
                    const start = Date.now();
                    const response = await fetch(\`\${baseUrl}/\${testPath}\`);
                    const end = Date.now();
                    subsequentTimes.push(end - start);
                    cacheStatuses.push(response.headers.get('x-cache') || 'UNKNOWN');
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const avgSubsequentTime = subsequentTimes.reduce((a, b) => a + b, 0) / subsequentTimes.length;
                const improvement = firstTime > avgSubsequentTime ? 
                    ((firstTime - avgSubsequentTime) / firstTime * 100).toFixed(1) : '0';

                resultDiv.className = 'status success';
                resultDiv.innerHTML = \`
                    📊 <strong>性能测试完成！</strong><br>
                    <table class="stats-table">
                        <tr><th>测试项目</th><th>结果</th></tr>
                        <tr><td>� 首次请求耗时</td><td>\${firstTime}ms (\${firstCacheStatus})</td></tr>
                        <tr><td>🏃 后续请求耗时</td><td>\${avgSubsequentTime.toFixed(1)}ms（平均）</td></tr>
                        <tr><td>⚡ 性能提升</td><td>\${improvement}%</td></tr>
                        <tr><td>📁 测试文件</td><td>\${testPath}</td></tr>
                        <tr><td>🔢 测试次数</td><td>\${iterations}次</td></tr>
                        <tr><td>📋 缓存状态</td><td>\${cacheStatuses.join(', ')}</td></tr>
                    </table>
                    <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                        💡 提示：性能测试基于当前缓存状态，缓存命中时响应会更快
                    </p>
                \`;
                
                getCacheStats(); // 刷新统计
            } catch (error) {
                resultDiv.className = 'status error';
                resultDiv.textContent = \`❌ 性能测试失败: \${error.message}\`;
            }
        }

        async function batchTest() {
            const resultDiv = document.getElementById('performance-result');
            resultDiv.style.display = 'block';
            resultDiv.className = 'status loading pulse';
            resultDiv.textContent = '📦 正在运行批量测试...';

            const testFiles = [
                'npm/vue@3/dist/vue.global.min.js',
                'npm/react@18/umd/react.production.min.js',
                'npm/axios@1.5.0/dist/axios.min.js',
                'npm/lodash@4.17.21/lodash.min.js',
                'npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
            ];

            try {
                let successCount = 0;
                let totalTime = 0;
                const results = [];

                for (const file of testFiles) {
                    const start = Date.now();
                    try {
                        const response = await fetch(\`\${baseUrl}/\${file}\`);
                        const end = Date.now();
                        const duration = end - start;
                        
                        if (response.ok) {
                            successCount++;
                            totalTime += duration;
                            const cacheStatus = response.headers.get('x-cache') || 'UNKNOWN';
                            results.push({ file, duration, cacheStatus, success: true });
                        } else {
                            results.push({ file, duration, cacheStatus: 'ERROR', success: false });
                        }
                    } catch (error) {
                        results.push({ file, duration: 0, cacheStatus: 'ERROR', success: false });
                    }
                }

                const avgTime = totalTime / successCount;
                
                resultDiv.className = 'status success';
                resultDiv.innerHTML = \`
                    📦 <strong>批量测试完成！</strong><br>
                    <strong>✅ 成功：</strong> \${successCount}/\${testFiles.length} 个文件<br>
                    <strong>⏱️ 平均耗时：</strong> \${avgTime.toFixed(1)}ms<br><br>
                    <table class="stats-table">
                        <tr><th>文件</th><th>耗时</th><th>缓存状态</th></tr>
                        \${results.map(r => \`
                            <tr style="color: \${r.success ? 'inherit' : '#dc3545'}">
                                <td>\${r.file.split('/').pop()}</td>
                                <td>\${r.duration}ms</td>
                                <td>\${r.cacheStatus}</td>
                            </tr>
                        \`).join('')}
                    </table>
                \`;
                
                getCacheStats(); // 刷新统计
            } catch (error) {
                resultDiv.className = 'status error';
                resultDiv.textContent = \`❌ 批量测试失败: \${error.message}\`;
            }
        }

        // 页面加载时自动检查状态
        window.onload = function() {
            checkServerStatus();
            getCacheStats();
        };

        // 每30秒自动刷新状态
        setInterval(() => {
            checkServerStatus();
            getCacheStats();
        }, 30000);
    </script>
</body>
</html>
  `;
  
  res.send(dashboardHTML);
});

// 获取文件MIME类型
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// 检查文件是否过期
async function isFileExpired(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const now = Date.now();
    const fileAge = (now - stats.mtime.getTime()) / 1000; // 转换为秒
    return fileAge > config.CACHE_TTL;
  } catch (error) {
    return true; // 如果文件不存在，认为已过期
  }
}

// 主要的代理处理函数
app.use('/', async (req, res) => {
  const urlPath = decodeURIComponent(req.path);
  const cachePath = path.join(config.CACHE_DIR, urlPath);
  const cacheKey = `file:${urlPath}`;

  try {
    // 检查内存缓存中的文件信息
    const cachedInfo = memoryCache.get(cacheKey);
    
    // 如果文件存在且未过期
    if (await fs.pathExists(cachePath) && !(await isFileExpired(cachePath))) {
      console.log(`Serving from cache: ${urlPath}`);
      
      // 设置缓存头
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // 设置正确的 Content-Type
      if (cachedInfo && cachedInfo.contentType) {
        res.setHeader('Content-Type', cachedInfo.contentType);
      } else {
        res.setHeader('Content-Type', getMimeType(cachePath));
      }
      
      return res.sendFile(path.resolve(cachePath));
    }

    console.log(`Fetching from jsDelivr: ${urlPath}`);
    
    // 从 jsDelivr 获取资源
    const response = await fetch(config.BASE_URL + urlPath, {
      headers: {
        'User-Agent': 'jsDelivr-Proxy/1.0.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${urlPath}: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: 'Failed to fetch resource',
        status: response.status,
        statusText: response.statusText,
        url: config.BASE_URL + urlPath
      });
    }

    // 检查文件大小
    const contentLength = parseInt(response.headers.get('content-length')) || 0;
    if (contentLength > config.MAX_FILE_SIZE) {
      console.warn(`File too large: ${urlPath} (${contentLength} bytes)`);
      return res.status(413).json({
        error: 'File too large',
        maxSize: config.MAX_FILE_SIZE,
        actualSize: contentLength
      });
    }

    // 获取响应数据
    const buffer = await response.arrayBuffer();
    const data = Buffer.from(buffer);
    
    // 获取内容类型
    const contentType = response.headers.get('content-type') || getMimeType(urlPath);
    
    // 异步保存到磁盘缓存
    fs.ensureDir(path.dirname(cachePath))
      .then(() => fs.writeFile(cachePath, data))
      .then(() => {
        console.log(`Cached file: ${urlPath}`);
        // 保存文件信息到内存缓存
        memoryCache.set(cacheKey, {
          contentType,
          size: data.length,
          cachedAt: new Date().toISOString()
        });
      })
      .catch(err => {
        console.error(`Failed to cache file ${urlPath}:`, err);
      });

    // 设置响应头
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', data.length);

    // 返回内容
    res.send(data);

  } catch (error) {
    console.error(`Error processing request for ${urlPath}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      path: urlPath
    });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    message: 'The requested resource was not found'
  });
});

// 启动服务器
const server = app.listen(config.PORT, () => {
  console.log(`🚀 jsDelivr Proxy Server started`);
  console.log(`📍 Server running at http://localhost:${config.PORT}`);
  console.log(`📦 Cache directory: ${config.CACHE_DIR}`);
  console.log(`⏰ Cache TTL: ${config.CACHE_TTL} seconds`);
  console.log(`💾 Max file size: ${config.MAX_FILE_SIZE} bytes`);
  console.log(`🔗 Proxying: ${config.BASE_URL}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});