const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { CATEGORIES, getCatalog, getMeta, getRawStreams } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());

// In-memory cache
const cache = new Map();
function getCached(key, ttlMs, fetchFn) {
    const cached = cache.get(key);
    const now = Date.now();
    if (cached && now - cached.timestamp < ttlMs) {
        return Promise.resolve(cached.data);
    }
    return fetchFn().then(data => {
        cache.set(key, { data, timestamp: now });
        return data;
    });
}

function resolveUrl(relative, base) {
    try {
        return new URL(relative, base).href;
    } catch {
        return relative;
    }
}

// Addon Manifest
const MANIFEST = {
    id: 'community.lacartoons',
    version: '1.0.0',
    name: 'LACartoons',
    description: 'Series animadas retro y clásicas de LACartoons en Español Latino (Cartoon Network, Nickelodeon, Fox Kids, Disney, Hanna-Barbera y más).',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'lacartoons_series',
            name: 'LACartoons',
            extra: [
                {
                    name: 'genre',
                    options: [
                        'Top',
                        'Nickelodeon',
                        'Cartoon Network',
                        'Fox Kids',
                        'Hanna Barbera',
                        'Disney',
                        'Warner Channel',
                        'Marvel',
                        'Otros'
                    ]
                },
                {
                    name: 'skip'
                },
                {
                    name: 'search'
                }
            ]
        }
    ],
    idPrefixes: ['lacartoons:'],
    behaviorHints: {
        configurable: false,
        configurationRequired: false
    }
};

function getServerBase(req) {
    const host = req.headers.host || `localhost:${PORT}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    return `${protocol}://${host}`;
}

// Landing page
app.get('/', (req, res) => {
    const serverBase = getServerBase(req);
    const host = req.headers.host || `localhost:${PORT}`;
    const manifestUrl = `${serverBase}/manifest.json`;
    const stremioUrl = `stremio://${host}/manifest.json`;
    const webStremioUrl = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl)}`;

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LACartoons - Stremio Addon</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: radial-gradient(circle at top, #1a1b36 0%, #0d0e1a 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            max-width: 600px;
            width: 100%;
            padding: 40px 30px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .badge {
            display: inline-block;
            background: #ff5722;
            color: white;
            font-size: 12px;
            font-weight: bold;
            padding: 4px 12px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        h1 {
            font-size: 32px;
            margin-bottom: 12px;
            background: linear-gradient(90deg, #ff8a00, #e52e71);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            color: #b3b3b3;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 25px;
        }
        .channels {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
            margin-bottom: 30px;
        }
        .channel-tag {
            background: rgba(255, 255, 255, 0.08);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            color: #d1d5db;
        }
        .buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .btn {
            display: block;
            padding: 14px 20px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            border: none;
        }
        .btn-primary {
            background: linear-gradient(135deg, #7c4dff, #651fff);
            color: white;
            box-shadow: 0 4px 15px rgba(101, 31, 255, 0.4);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(101, 31, 255, 0.6);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.18);
        }
        .manifest-box {
            margin-top: 25px;
            background: #090a10;
            padding: 10px 14px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 13px;
            color: #9ca3af;
            word-break: break-all;
            user-select: all;
            border: 1px dashed rgba(255, 255, 255, 0.15);
        }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">Stremio Addon</span>
        <h1>LACartoons</h1>
        <p>Disfruta de cientos de caricaturas y series animadas clásicas y retro en Audio Latino.</p>
        
        <div class="channels">
            <span class="channel-tag">Cartoon Network</span>
            <span class="channel-tag">Nickelodeon</span>
            <span class="channel-tag">Fox Kids</span>
            <span class="channel-tag">Hanna-Barbera</span>
            <span class="channel-tag">Disney</span>
            <span class="channel-tag">Warner Channel</span>
            <span class="channel-tag">Marvel</span>
        </div>

        <div class="buttons">
            <a class="btn btn-primary" href="${stremioUrl}">🚀 Instalar en Stremio</a>
            <a class="btn btn-secondary" href="${webStremioUrl}" target="_blank">🌐 Abrir en Stremio Web</a>
            <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${manifestUrl}'); alert('¡Enlace de manifest copiado al portapapeles!');">📋 Copiar enlace del Addon</button>
        </div>

        <div class="manifest-box">${manifestUrl}</div>
    </div>
</body>
</html>`);
});

// Manifest route
app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'max-age=86400, public');
    res.json(MANIFEST);
});

// Helper to parse extra params
function parseExtra(extraStr, queryObj) {
    const extra = {};
    if (extraStr) {
        const parts = extraStr.split('&');
        for (const p of parts) {
            const [k, v] = p.split('=');
            if (k) extra[decodeURIComponent(k)] = decodeURIComponent(v || '');
        }
    }
    for (const [k, v] of Object.entries(queryObj || {})) {
        if (!extra[k]) extra[k] = v;
    }
    return extra;
}

// Catalog route
async function handleCatalog(req, res) {
    try {
        const { type, id } = req.params;
        if (type !== 'series') {
            return res.json({ metas: [] });
        }

        const extra = parseExtra(req.params.extra, req.query);
        const genre = extra.genre || 'Top';
        const skip = parseInt(extra.skip || '0', 10);
        const search = extra.search || null;

        const cacheKey = `catalog:${genre}:${skip}:${search || ''}`;
        const metas = await getCached(cacheKey, 10 * 60 * 1000, () => getCatalog(genre, skip, search));

        res.setHeader('Cache-Control', 'max-age=3600, public');
        res.json({ metas });
    } catch (err) {
        console.error('Catalog error:', err);
        res.json({ metas: [] });
    }
}

app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra.json', handleCatalog);

// Meta route
app.get('/meta/:type/:id.json', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type !== 'series' || !id.startsWith('lacartoons:')) {
            return res.json({ meta: null });
        }

        const serieId = id.replace('lacartoons:', '').split(':')[0];
        const cacheKey = `meta:${serieId}`;

        const meta = await getCached(cacheKey, 30 * 60 * 1000, () => getMeta(serieId));
        res.setHeader('Cache-Control', 'max-age=3600, public');
        res.json({ meta });
    } catch (err) {
        console.error('Meta error:', err);
        res.json({ meta: null });
    }
});

// Stream route
app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type !== 'series' || !id.startsWith('lacartoons:')) {
            return res.json({ streams: [] });
        }

        const parts = id.split(':');
        let capituloId = null;
        let seasonNum = 1;

        if (parts.length >= 5) {
            seasonNum = parseInt(parts[2], 10) || 1;
            capituloId = parts[4];
        } else if (parts.length === 2) {
            capituloId = parts[1];
        }

        if (!capituloId) {
            return res.json({ streams: [] });
        }

        const cacheKey = `rawstreams:${capituloId}:${seasonNum}`;
        const rawStreams = await getCached(cacheKey, 2 * 60 * 1000, () => getRawStreams(capituloId, seasonNum));
        const serverBase = getServerBase(req);

        const streams = rawStreams.slice(0, 1).map(s => {
            let proxyUrl;
            if (s.type === 'hls') {
                proxyUrl = `${serverBase}/proxy/m3u8?url=${encodeURIComponent(s.targetUrl)}&referer=${encodeURIComponent(s.referer)}`;
            } else {
                proxyUrl = `${serverBase}/proxy/video?url=${encodeURIComponent(s.targetUrl)}&referer=${encodeURIComponent(s.referer)}`;
            }

            return {
                name: s.name,
                title: s.title,
                url: proxyUrl,
                behaviorHints: {
                    notWebReady: false
                }
            };
        });

        res.setHeader('Cache-Control', 'max-age=600, public');
        res.json({ streams });
    } catch (err) {
        console.error('Stream error:', err);
        res.json({ streams: [] });
    }
});

// ================= STREAM PROXY HANDLERS =================

// 1. HLS Playlist proxy (rewrites sub-playlists and segments)
const handleM3u8Proxy = async (req, res) => {
    const targetUrl = req.query.url;
    const referer = req.query.referer || 'https://cubeembed.rpmvid.com/';

    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const u = new URL(targetUrl);
        const client = u.protocol === 'https:' ? https : http;

        client.get(u, {
            rejectUnauthorized: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Origin': new URL(referer).origin
            }
        }, (proxyRes) => {
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                const nextUrl = resolveUrl(proxyRes.headers.location, targetUrl);
                return res.redirect(`/proxy/m3u8?url=${encodeURIComponent(nextUrl)}&referer=${encodeURIComponent(referer)}`);
            }

            let data = '';
            proxyRes.on('data', chunk => data += chunk);
            proxyRes.on('end', () => {
                const serverBase = getServerBase(req);
                const lines = data.split('\n');
                const rewritten = [];

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) {
                        rewritten.push(line);
                        continue;
                    }

                    // Map URI (initialization segments)
                    if (trimmed.startsWith('#EXT-X-MAP:')) {
                        rewritten.push(line.replace(/URI=["']([^"']+)["']/i, (m, uri) => {
                            const fullUri = resolveUrl(uri, targetUrl);
                            return `URI="${serverBase}/proxy/seg?url=${encodeURIComponent(fullUri)}&referer=${encodeURIComponent(referer)}"`;
                        }));
                        continue;
                    }

                    // Media URI (audio/subtitles)
                    if (trimmed.startsWith('#EXT-X-MEDIA:')) {
                        rewritten.push(line.replace(/URI=["']([^"']+)["']/i, (m, uri) => {
                            const fullUri = resolveUrl(uri, targetUrl);
                            return `URI="${serverBase}/proxy/m3u8?url=${encodeURIComponent(fullUri)}&referer=${encodeURIComponent(referer)}"`;
                        }));
                        continue;
                    }

                    if (trimmed.startsWith('#')) {
                        rewritten.push(line);
                        continue;
                    }

                    // Video/Audio Stream URI line
                    const fullUri = resolveUrl(trimmed, targetUrl);
                    if (fullUri.includes('.m3u8')) {
                        rewritten.push(`${serverBase}/proxy/m3u8?url=${encodeURIComponent(fullUri)}&referer=${encodeURIComponent(referer)}`);
                    } else {
                        rewritten.push(`${serverBase}/proxy/seg?url=${encodeURIComponent(fullUri)}&referer=${encodeURIComponent(referer)}`);
                    }
                }

                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'no-cache');
                res.send(rewritten.join('\n'));
            });
        }).on('error', (err) => {
            console.error('m3u8 proxy error:', err.message);
            res.status(502).send('Proxy error');
        });
    } catch (err) {
        console.error('m3u8 proxy exception:', err.message);
        res.status(500).send('Internal proxy error');
    }
};

app.get('/proxy/m3u8', handleM3u8Proxy);
app.head('/proxy/m3u8', (req, res) => {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end();
});

// 2. Segment and Video Proxy with Range header support (for MP4 and HLS segments)
function handleStreamProxy(req, res) {
    const targetUrl = req.query.url;
    const referer = req.query.referer || 'https://cubeembed.rpmvid.com/';

    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const u = new URL(targetUrl);
        const client = u.protocol === 'https:' ? https : http;

        const forwardHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': referer,
            'Origin': new URL(referer).origin
        };

        if (req.headers.range) {
            forwardHeaders['Range'] = req.headers.range;
        }

        const proxyReq = client.request(u, {
            method: req.method || 'GET',
            rejectUnauthorized: false,
            headers: forwardHeaders
        }, (proxyRes) => {
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                const nextUrl = resolveUrl(proxyRes.headers.location, targetUrl);
                return res.redirect(`/proxy/seg?url=${encodeURIComponent(nextUrl)}&referer=${encodeURIComponent(referer)}`);
            }

            res.status(proxyRes.statusCode);

            const headersToForward = [
                'content-type',
                'content-length',
                'content-range',
                'accept-ranges'
            ];

            for (const h of headersToForward) {
                if (proxyRes.headers[h]) {
                    res.setHeader(h, proxyRes.headers[h]);
                }
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Range');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

            if (req.method === 'HEAD') {
                return res.end();
            }

            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Stream proxy error:', err.message);
            if (!res.headersSent) res.status(502).send('Stream error');
        });

        req.on('close', () => {
            proxyReq.destroy();
        });

        proxyReq.end();
    } catch (err) {
        console.error('Stream proxy exception:', err.message);
        if (!res.headersSent) res.status(500).send('Internal proxy error');
    }
}

app.all('/proxy/seg', handleStreamProxy);
app.all('/proxy/video', handleStreamProxy);

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Addon LACartoons iniciado correctamente en puerto ${PORT}`);
    console.log(`📡 URL local: http://localhost:${PORT}`);
    console.log(`📦 Manifest: http://localhost:${PORT}/manifest.json`);
    console.log(`======================================================\n`);
});
