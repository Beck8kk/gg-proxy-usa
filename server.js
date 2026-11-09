const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de User-Agent para evitar bloqueios de bot
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Função principal: O Proxy
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        res.redirect('/');
        return;
    }

    // Sanitização básica
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        res.status(400).send('Invalid URL');
        return;
    }

    // Header para indicar que é uma resposta de proxy (útil para debugging)
    res.setHeader('X-Proxy-Original', targetUrl);

    fetch(targetUrl, {
        headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        },
        redirect: 'follow'
    })
    .then(response => {
        const contentType = response.headers.get('content-type') || '';
        
        // Headers importantes para CORS e Cache
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Permite iframes

        // Ler o corpo
        response.text().then(body => {
            if (contentType.includes('text/html')) {
                const rewrittenBody = rewriteHtml(body, targetUrl, req);
                res.send(rewrittenBody);
            } else {
                res.send(body);
            }
        });
    })
    .catch(error => {
        console.error('Proxy Error:', error);
        res.status(502).send(`Proxy Error: ${error.message}`);
    });
});

// Servir a Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Lógica de Rewriting HTML
function rewriteHtml(html, baseUrl, req) {
    // Extrai o host da URL base para relativo
    const url = new URL(baseUrl);
    const protocol = url.protocol;
    const host = url.host;

    // 1. Injetar CSS para esconder scrollbars e ajustar layout
    const proxyCss = `
        <style id="gg-proxy-css">
            /* Ajustes globais para o proxy */
            html { overflow-y: scroll; }
            /* Esconder iframes que podem quebrar o layout se não ajustados */
            /* Opcional: Escalar o conteúdo se necessário */
        </style>
    `;

    // 2. Injetar Script de Rewrite
    const proxyScript = `
        <script>
            // Script para reescrever links dinâmicos e iframes
            const PROXY_PREFIX = '/proxy?url=';
            
            function rewriteUrl(url, currentBase) {
                if (!url || url.startsWith('data:') || url.startsWith('javascript:')) return url;
                if (url.startsWith('/proxy?url=')) return url;
                
                let absoluteUrl = url;
                try {
                    absoluteUrl = new URL(url, currentBase).href;
                } catch(e) {
                    return url;
                }

                if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
                    return PROXY_PREFIX + encodeURIComponent(absoluteUrl);
                }
                return url;
            }

            // Reescrever atributos no DOM
            function processDom() {
                const currentUrl = window.location.href;
                // Extrai a URL real por trás do proxy para usar como base
                const proxyMatch = currentUrl.match(/url=([^&]*)/);
                const baseHref = proxyMatch ? decodeURIComponent(proxyMatch[1]) : window.location.origin;

                // Links <a>
                document.querySelectorAll('a[href]').forEach(el => {
                    const href = el.getAttribute('href');
                    if (href && !href.startsWith('javascript:')) {
                        el.setAttribute('href', rewriteUrl(href, baseHref));
                    }
                });

                // Imagens
                document.querySelectorAll('img[src]').forEach(el => {
                    const src = el.getAttribute('src');
                    if (src) el.setAttribute('src', rewriteUrl(src, baseHref));
                });

                // Iframes
                document.querySelectorAll('iframe[src]').forEach(el => {
                    const src = el.getAttribute('src');
                    if (src) el.setAttribute('src', rewriteUrl(src, baseHref));
                });

                // Backgrounds em inline styles
                document.querySelectorAll('[style]').forEach(el => {
                    let style = el.getAttribute('style');
                    // Simple regex to replace url(...) in CSS
                    style = style.replace(/url\\(['"]?([^'")]+)['"]?\\)/g, (match, p1) => {
                        return 'url(' + rewriteUrl(p1, baseHref) + ')';
                    });
                    el.setAttribute('style', style);
                });
            }

            // Executar quando o DOM estiver pronto
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', processDom);
            } else {
                processDom();
            }
        </script>
    `;

    // Injeção simples: antes de </head>
    let injectedHtml = html.replace(/<\/head>/i, `${proxyCss}${proxyScript}</head>`);

    // Se não houver </head>, injeta no início
    if (injectedHtml === html) {
        injectedHtml = `${proxyCss}${proxyScript}${html}`;
    }

    // 3. Rewriting de Links Estáticos no HTML (Regex básico para performance inicial)
    // Este passo cobre o HTML inicial antes do JS carregar
    
    // A tags
    injectedHtml = injectedHtml.replace(/href=["']([^"']+)["']/gi, (match, p1) => {
        if (p1.startsWith('data:') || p1.startsWith('javascript:')) return match;
        const newHref = rewriteUrl(p1, baseUrl);
        return `href="${newHref}"`;
    });

    // Src tags (img, video, source)
    injectedHtml = injectedHtml.replace(/src=["']([^"']+)["']/gi, (match, p1) => {
        if (p1.startsWith('data:')) return match;
        const newSrc = rewriteUrl(p1, baseUrl);
        return `src="${newSrc}"`;
    });

    // URL em CSS (link rel=stylesheet)
    injectedHtml = injectedHtml.replace(/href=["']([^"']+)["'] rel=["']stylesheet["']/gi, (match, p1) => {
        const newHref = rewriteUrl(p1, baseUrl);
        return `href="${newHref}" rel="stylesheet"`;
    });

    // CSS url() dentro de <style>
    injectedHtml = injectedHtml.replace(/url\(['"]?([^'")]+)['"]?\)/gi, (match, p1) => {
        const newUrl = rewriteUrl(p1, baseUrl);
        return `url('${newUrl}')`;
    });

    return injectedHtml;
}

// Função auxiliar no servidor para reescrever URLs de forma consistente
function rewriteUrl(url, baseUrl) {
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
    console.log(`Acesse: http://localhost:${PORT}`);
});
