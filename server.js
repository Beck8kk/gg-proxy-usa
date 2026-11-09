const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// User-Agent para parecer um navegador Chrome moderno
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Rota do Proxy
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.redirect('/');
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    // Faz o fetch real da internet
    fetch(targetUrl, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        },
        redirect: 'follow'
    })
    .then(response => {
        const contentType = response.headers.get('content-type') || '';
        
        // REMOVE HEADERS QUE BLOQUEIAM O PROXY
        res.setHeader('Content-Type', contentType);
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('X-Content-Type-Options');
        res.setHeader('Access-Control-Allow-Origin', '*');

        response.text().then(body => {
            if (contentType.includes('text/html')) {
                res.send(rewriteHtml(body, targetUrl));
            } else {
                res.send(body);
            }
        });
    })
    .catch(error => {
        // MENSAGEM DE ERRO VISÍVEL (não mais fundo azul vazio)
        const errorHtml = `
            <html lang="pt-BR">
            <head><title>GG Proxy USA - Erro</title>
            <style>
                body { background: #0f111a; color: #e0e0e0; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .error-box { background: #1a1d29; padding: 2rem; border-radius: 12px; border: 1px solid #ff4d4d; max-width: 600px; }
                h2 { color: #ff4d4d; margin-top: 0; }
                pre { background: #000; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 0.8rem; }
                a { color: #00d2ff; }
            </style></head>
            <body>
                <div class="error-box">
                    <h2>⚠️ Erro no Proxy</h2>
                    <p>O site de destino não respondeu ou o proxy falhou ao reescrever o conteúdo.</p>
                    <p><strong>URL solicitada:</strong> ${targetUrl}</p>
                    <p><strong>Detalhe:</strong> ${error.message}</p>
                    <a href="/">← Voltar para o GG Proxy USA</a>
                </div>
            </body>
            </html>
        `;
        res.status(502).send(errorHtml);
    });
});

// Rota da Home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// FUNÇÃO DE REWRITING APRIMORADA
function rewriteHtml(html, baseUrl) {
    const PROXY_PREFIX = '/proxy?url=';
    
    // Script de correção dinâmica (para JS que carrega depois)
    const injectScript = `
        <script>
            const PROXY = '/proxy?url=';
            function rewriteUrl(url) {
                if (!url || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('/proxy?url=')) return url;
                try {
                    const absUrl = new URL(url, window.location.href).href;
                    if (absUrl.startsWith('http')) return PROXY + encodeURIComponent(absUrl);
                } catch(e) {}
                return url;
            }
            // Reescrever no DOM
            document.querySelectorAll('a[href]').forEach(a => a.href = rewriteUrl(a.href));
            document.querySelectorAll('img[src]').forEach(img => img.src = rewriteUrl(img.src));
            document.querySelectorAll('iframe[src]').forEach(iframe => iframe.src = rewriteUrl(iframe.src));
            document.querySelectorAll('source[src]').forEach(src => src.src = rewriteUrl(src.src));
            document.querySelectorAll('link[href]').forEach(link => {
                if (link.rel && link.rel.includes('stylesheet')) link.href = rewriteUrl(link.href);
            });
        </script>
    `;

    let finalHtml = html.replace(/<\/head>/i, injectScript + '</head>');
    if (finalHtml === html) finalHtml = injectScript + html;

    // Rewriting de A tags
    finalHtml = finalHtml.replace(/href=["']([^"']+)["']/gi, (match, p1) => {
        if (p1.startsWith('data:') || p1.startsWith('javascript:') || p1.startsWith('/proxy?url=')) return match;
        return `href="${rewriteUrlServer(p1, baseUrl)}"`;
    });

    // Rewriting de Src tags
    finalHtml = finalHtml.replace(/src=["']([^"']+)["']/gi, (match, p1) => {
        if (p1.startsWith('data:') || p1.startsWith('/proxy?url=')) return match;
        return `src="${rewriteUrlServer(p1, baseUrl)}"`;
    });

    // Rewriting de CSS url()
    finalHtml = finalHtml.replace(/url\\(['"]?([^'")]+)['"]?\\)/gi, (match, p1) => {
        if (p1.startsWith('data:') || p1.startsWith('/proxy?url=')) return match;
        return `url('${rewriteUrlServer(p1, baseUrl)}')`;
    });

    return finalHtml;
}

function rewriteUrlServer(url, baseUrl) {
    if (!url) return url;
    if (url.startsWith('/proxy?url=')) return url;
    if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#')) return url;

    let absoluteUrl = url;
    try {
        absoluteUrl = new URL(url, baseUrl).href;
    } catch (e) {
        return url;
    }

    if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
        return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    }
    return url;
}

app.listen(PORT, () => {
    console.log(`GG Proxy USA rodando na porta ${PORT}`);
});
