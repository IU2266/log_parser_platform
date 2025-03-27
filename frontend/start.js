const http = require('http');
const httpServer = require('http-server');
const port = 5000;

// 创建 http-server 实例
const httpServerInstance = httpServer.createServer({
    root: './', // 设置服务器根目录
    cache: -1 // 禁用缓存
});

// 使用 Node.js 的 http 模块创建服务器
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(302, {
            Location: '/login.html'
        });
        res.end();
    } else {
        // 其他请求交给 http-server 处理
        httpServerInstance.server.emit('request', req, res);
    }
});

server.listen(port, () => {
    console.log(`前端服务已启动，访问地址: http://localhost:${port}`);
});