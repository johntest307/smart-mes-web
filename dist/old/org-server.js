const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 8000);
const root = __dirname;

function send(response, status, body, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': 'http://localhost:' + port });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 2_000_000) reject(new Error('Request too large')); });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function callGroq(prompt) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY 尚未設定');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.2, messages: [
      { role: 'system', content: '你是 AI GPU 伺服器產線的人力與合規分析顧問。請以繁體中文輸出，重點清楚、避免虛構資料。' },
      { role: 'user', content: prompt }
    ] })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Groq API ${response.status}`);
  return data.choices?.[0]?.message?.content || 'Groq 未回傳分析內容';
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/api/analyze') {
      const payload = JSON.parse(await readBody(request));
      const report = await callGroq(payload.prompt || '請分析目前產線資料。');
      return send(response, 200, JSON.stringify({ report }));
    }
    if (request.method === 'GET' && (request.url === '/' || request.url === '/index.html')) {
      return send(response, 200, fs.readFileSync(path.join(root, 'index.html')), 'text/html; charset=utf-8');
    }
    if (request.method === 'GET' && request.url.startsWith('/%E7%85%A7%E7%89%87/')) {
      const filename = decodeURIComponent(request.url.slice('/%E7%85%A7%E7%89%87/'.length));
      if (!/^\d\.png$/.test(filename)) return send(response, 404, JSON.stringify({ error: 'Not found' }));
      const imagePath = path.join(root, '照片', filename);
      if (!fs.existsSync(imagePath)) return send(response, 404, JSON.stringify({ error: 'Not found' }));
      return send(response, 200, fs.readFileSync(imagePath), 'image/png');
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && request.url.startsWith('/%E5%BD%B1%E7%89%87/')) {
      const filename = decodeURIComponent(request.url.slice('/%E5%BD%B1%E7%89%87/'.length));
      if (!/^\d\.mp4$/.test(filename)) return send(response, 404, JSON.stringify({ error: 'Not found' }));
      const videoPath = path.join(root, '影片', filename);
      if (!fs.existsSync(videoPath)) return send(response, 404, JSON.stringify({ error: 'Not found' }));
      const size = fs.statSync(videoPath).size;
      const range = request.headers.range;
      if (request.method === 'HEAD') {
        response.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': size, 'Accept-Ranges': 'bytes' });
        return response.end();
      }
      if (range) {
        const match = range.match(/bytes=(\d*)-(\d*)/);
        if (match) {
          const start = match[1] ? Number(match[1]) : Math.max(size - Number(match[2]), 0);
          const end = match[2] ? Number(match[2]) : size - 1;
          if (start <= end && start < size) {
            const chunk = fs.readFileSync(videoPath).subarray(start, Math.min(end + 1, size));
            response.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Length': chunk.length, 'Content-Range': `bytes ${start}-${start + chunk.length - 1}/${size}`, 'Accept-Ranges': 'bytes' });
            return response.end(chunk);
          }
        }
      }
      response.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': size, 'Accept-Ranges': 'bytes' });
      return response.end(fs.readFileSync(videoPath));
    }
    if (request.method === 'GET' && /^\/(出缺勤資料|紀律事件)\.xlsx$/.test(decodeURIComponent(request.url))) {
      const workbookPath = path.join(root, decodeURIComponent(request.url.slice(1)));
      if (!fs.existsSync(workbookPath)) return send(response, 404, JSON.stringify({ error: 'Not found' }));
      return send(response, 200, fs.readFileSync(workbookPath), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    if (request.method === 'GET' && request.url === '/health') return send(response, 200, JSON.stringify({ ok: true }));
    send(response, 404, JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    send(response, 500, JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => console.log(`Dashboard running at http://localhost:${port}`));
