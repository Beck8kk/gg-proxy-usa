const express = require('express');
const { Titanium } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuração do Titanium (Ultraviolet)
const titanium = new Titanium({
  // Otimizações para performance
  fetch: {
    // Remove headers que podem causar problemas de cache ou CORS no browser
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    // Aumenta o timeout para jogos que carregam assets pesados
    timeout: 30000
  },
  // Configurações de Rewriting
  rewrite: {
    // Remove headers que bloqueiam iframes (X-Frame-Options, CSP)
    removeHeaders: [
      'x-frame-options',
      'content-security-policy',
      'content-security-policy-report-only'
    ],
    // Reescreve URLs no HTML/JS/CSS
    rewriteUrls: true,
    // Reescreve caminhos absolutos para relativos baseados no proxy
    rewriteBase: true
  },
  // Configurações de Cookies
  cookies: {
    // Garante que os cookies do now.gg funcionem corretamente
    secure: true,
    httpOnly: true,
    sameSite: 'Lax'
  }
});

// Middleware para logar requisições (opcional, útil para debug no Render)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rota raiz: Interface do usuário
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>GG Proxy USA</title>
    <style>
        :root {
            --bg-color: #0f0f0f;
            --panel-bg: #1a1a1a;
            --text-color: #e0e0e0;
            --accent-color: #00ff88;
            --button-hover: #00cc6a;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        header {
            padding: 1rem;
            text-align: center;
            border-bottom: 1px solid #333;
            background-color: var(--panel-bg);
        }

        h1 {
            margin: 0;
            font-size: 1.5rem;
            color: var(--accent-color);
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 1rem;
            gap: 1rem;
        }

        .controls {
            display: flex;
            gap: 0.5rem;
            background-color: var(--panel-bg);
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }

        input[type="text"] {
            flex: 1;
            padding: 0.75rem;
            border: none;
            border-radius: 4px;
            background-color: #2a2a2a;
            color: white;
            font-size: 1rem;
            outline: none;
        }

        input[type="text"]:focus {
            border: 1px solid var(--accent-color);
        }

        button {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            background-color: var(--accent-color);
            color: black;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        button:hover {
            background-color: var(--button-hover);
        }

        .shortcuts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.5rem;
        }

        .shortcut-btn {
            background-color: #2a2a2a;
            color: var(--text-color);
            border: 1px solid #444;
            font-size: 0.9rem;
        }
        
        .shortcut-btn:hover {
            border-color: var(--accent-color);
            color: var(--accent-color);
        }

        .viewport {
            flex: 1;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }

        iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }

        .loading {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        }

        .loading.active {
            opacity: 1;
            pointer-events: auto;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-top: 5px solid var(--accent-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
            }
            .shortcuts {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>

<header>
    <h1>GG Proxy USA</h1>
</header>

<div class="container">
    <div class="controls">
        <input type="text" id="urlInput" placeholder="https://now.gg/play/..." value="https://now.gg/play/roblox-corporation/5349/roblox">
        <button onclick="loadUrl()">GO</button>
    </div>

    <div class="shortcuts">
        <button class="shortcut-btn" onclick="loadShortcut('https://now.gg/play/roblox-corporation/5349/roblox')">Roblox</button>
        <button class="shortcut-btn" onclick="loadShortcut('https://now.gg/play/garena/1909/free-fire-max')">Free Fire Max</button>
        <button class="shortcut-btn" onclick="loadShortcut('https://now.gg/play/kitka/2103/stumble-guys')">Stumble Guys</button>
        <button class="shortcut-btn" onclick="loadShortcut('https://now.gg/play/indie/2680/99-nights-in-the-forest')">99 Nights</button>
    </div>

    <div class="viewport">
        <div class="loading" id="loader">
            <div class="spinner"></div>
        </div>
        <iframe id="gameFrame" src="about:blank" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-pointer-lock"></iframe>
    </div>
</div>

<script>
    const proxyBase = '/proxy';
    const iframe = document.getElementById('gameFrame');
    const loader = document.getElementById('loader');

    function loadUrl() {
        const target = document.getElementById('urlInput').value.trim();
        if (!target) return;
        
        // Garante que a URL tenha protocolo
        let finalUrl = target;
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        // Ativa loader
        loader.classList.add('active');
        
        // Carrega no iframe via proxy
        // A sintaxe /proxy?url=... faz o Titanium interceptar e reescrever
        iframe.src = \`\${proxyBase}?url=\${encodeURIComponent(finalUrl)}\`;
        
        // Esconde loader após um tempo (ou quando o iframe carregar)
        setTimeout(() => {
            loader.classList.remove('active');
        }, 3000);
    }

    function loadShortcut(url) {
        document.getElementById('urlInput').value = url;
        loadUrl();
    }

    // Carrega a URL padrão ao abrir
    window.onload = loadUrl;
</script>

</body>
</html>
  `;
  res.send(html);
});

// Rota do Proxy
// Qualquer requisição para /proxy?url=https://now.gg/... será processada
app.use('/proxy', (req, res) => {
  // O Titanium middleware espera a URL alvo.
  // Ele extrai a query string ?url= e processa o fetch.
  titanium.middleware(req, res, (err) => {
    if (err) {
      console.error('Proxy Error:', err);
      res.status(500).send({ error: 'Proxy Error', message: err.message });
    }
  });
});

// Handler de erro global para garantir que não haja "headers already sent"
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`GG Proxy USA rodando na porta ${PORT}`);
  console.log('Acessado via:', `http://localhost:${PORT}`);
});
