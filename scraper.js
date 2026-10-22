const https = require('https');
const http = require('http');

const BASE_URL = 'https://www.lacartoons.com';

const CATEGORIES = {
    'Top': null,
    'Nickelodeon': 1,
    'Cartoon Network': 2,
    'Fox Kids': 3,
    'Hanna Barbera': 4,
    'Disney': 5,
    'Warner Channel': 6,
    'Marvel': 7,
    'Otros': 8
};

function fetchText(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const client = u.protocol === 'https:' ? https : http;
        const req = client.request(u, {
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...headers
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
                return fetchText(nextUrl, headers).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.end();
    });
}

function cleanText(text) {
    if (!text) return '';
    return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Scrape catalog (cards)
async function getCatalog(genre = 'Top', skip = 0, search = null) {
    let url;
    const page = Math.floor(skip / 16) + 1;

    if (search && search.trim()) {
        url = `${BASE_URL}/?Titulo=${encodeURIComponent(search.trim())}&page=${page}`;
    } else {
        const catId = CATEGORIES[genre];
        if (catId) {
            url = `${BASE_URL}/?Categoria_id=${catId}&page=${page}`;
        } else {
            url = `${BASE_URL}/?page=${page}`;
        }
    }

    const html = await fetchText(url);
    const metas = [];

    const cardRegex = /<a[^>]*href=["'](\/serie\/(\d+))["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seenIds = new Set();

    while ((match = cardRegex.exec(html)) !== null) {
        const serieId = match[2];
        const inner = match[3];

        if (seenIds.has(serieId)) continue;
        seenIds.add(serieId);

        // Poster
        const imgMatch = inner.match(/<img[^>]*src=["']([^"']+)["']/i);
        let poster = imgMatch ? imgMatch[1] : '';
        if (poster && poster.startsWith('/')) {
            poster = `${BASE_URL}${poster}`;
        }

        // Title
        const nameMatch = inner.match(/<p class=["']nombre-serie["']>([\s\S]*?)<\/p>/i);
        const name = nameMatch ? cleanText(nameMatch[1]) : `Serie ${serieId}`;

        // Genre / Category
        const genreMatch = inner.match(/<span class=["']marcador marcadorSeries[^"']*["']>([\s\S]*?)<\/span>/i);
        const itemGenre = genreMatch ? cleanText(genreMatch[1]) : '';

        // Year
        const yearMatch = inner.match(/<span class=["']marcador marcador-ano["']>([\s\S]*?)<\/span>/i);
        const year = yearMatch ? cleanText(yearMatch[1]) : '';

        // Rating
        const ratingMatch = inner.match(/<span class=["']valoracion["']>(\d+)[\s\S]*?<\/span>/i);
        const rating = ratingMatch ? cleanText(ratingMatch[1]) : '';

        metas.push({
            id: `lacartoons:${serieId}`,
            type: 'series',
            name: name,
            poster: poster,
            posterShape: 'poster',
            genres: itemGenre ? [itemGenre] : [],
            releaseInfo: year,
            description: [
                itemGenre ? `Canal: ${itemGenre}` : null,
                year ? `Año: ${year}` : null,
                rating ? `Calificación: ${rating}/10 ⭐` : null
            ].filter(Boolean).join(' | ')
        });
    }

    return metas;
}

// Scrape serie details and all episodes
async function getMeta(serieId) {
    const url = `${BASE_URL}/serie/${serieId}`;
    const html = await fetchText(url);

    let title = `Serie ${serieId}`;
    const headerMatch = html.match(/<h2[^>]*class=["'][^"']*subtitulo-serie-seccion[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i);
    let genre = '';
    if (headerMatch) {
        const fullHeader = headerMatch[1];
        const spanMatch = fullHeader.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
        if (spanMatch) {
            genre = cleanText(spanMatch[1]);
        }
        title = cleanText(fullHeader.replace(/<span[\s\S]*?<\/span>/gi, ''));
    }

    const bgMatch = html.match(/<img[^>]*class=["'][^"']*fondo-serie-seccion[^"']*["'][^>]*src=["']([^"']+)["']/i);
    let background = bgMatch ? bgMatch[1] : '';
    if (background && background.startsWith('/')) {
        background = `${BASE_URL}${background}`;
    }

    const posterMatch = html.match(/<div class=["']imagen-serie["']>[\s\S]*?<img src=["']([^"']+)["']/i);
    let poster = posterMatch ? posterMatch[1] : '';
    if (poster && poster.startsWith('/')) {
        poster = `${BASE_URL}${poster}`;
    }
    if (!poster) poster = background;

    const yearMatch = html.match(/Año:\s*<span[^>]*>(\d+)<\/span>/i);
    const year = yearMatch ? cleanText(yearMatch[1]) : '';

    const ratingMatch = html.match(/Valoración:\s*<span[^>]*>(\d+)/i);
    const rating = ratingMatch ? cleanText(ratingMatch[1]) : '';

    const resenaMatch = html.match(/Reseña:\s*(?:<br\s*\/?>)?\s*<span>([\s\S]*?)<\/span>/i);
    const resena = resenaMatch ? cleanText(resenaMatch[1]) : '';

    const videos = [];
    const seasonRegex = /<h4[^>]*data-temporada-id=["'](\d+)["'][^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4[^>]*data-temporada-id=|$)/gi;
    let sMatch;

    while ((sMatch = seasonRegex.exec(html)) !== null) {
        const seasonId = parseInt(sMatch[1], 10);
        const seasonContent = sMatch[3];

        const epRegex = /<a[^>]*href=["']\/serie\/capitulo\/(\d+)\?t=(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let epMatch;

        while ((epMatch = epRegex.exec(seasonContent)) !== null) {
            const capituloId = epMatch[1];
            const tNum = parseInt(epMatch[2], 10) || seasonId;
            const rawEpText = cleanText(epMatch[3]);

            const numMatch = rawEpText.match(/Capitulo\s*(\d+)/i);
            const epNum = numMatch ? parseInt(numMatch[1], 10) : (videos.length + 1);

            let epName = rawEpText;
            const cleanTitleMatch = rawEpText.match(/Capitulo\s*\d+\s*[-:]?\s*(.*)/i);
            if (cleanTitleMatch && cleanTitleMatch[1]) {
                epName = cleanTitleMatch[1].trim();
            }

            videos.push({
                id: `lacartoons:${serieId}:${tNum}:${epNum}:${capituloId}`,
                title: epName || `Episodio ${epNum}`,
                season: tNum,
                episode: epNum,
                released: year ? `${year}-01-01T00:00:00.000Z` : undefined
            });
        }
    }

    if (videos.length === 0) {
        const epRegex = /<a[^>]*href=["']\/serie\/capitulo\/(\d+)\?t=(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let epMatch;
        let autoEp = 1;
        while ((epMatch = epRegex.exec(html)) !== null) {
            const capituloId = epMatch[1];
            const tNum = parseInt(epMatch[2], 10) || 1;
            const rawEpText = cleanText(epMatch[3]);
            const numMatch = rawEpText.match(/Capitulo\s*(\d+)/i);
            const epNum = numMatch ? parseInt(numMatch[1], 10) : autoEp++;
            let epName = rawEpText;
            const cleanTitleMatch = rawEpText.match(/Capitulo\s*\d+\s*[-:]?\s*(.*)/i);
            if (cleanTitleMatch && cleanTitleMatch[1]) {
                epName = cleanTitleMatch[1].trim();
            }

            videos.push({
                id: `lacartoons:${serieId}:${tNum}:${epNum}:${capituloId}`,
                title: epName || `Episodio ${epNum}`,
                season: tNum,
                episode: epNum,
                released: year ? `${year}-01-01T00:00:00.000Z` : undefined
            });
        }
    }

    const descParts = [
        resena ? resena : null,
        '',
        [
            genre ? `Canal: ${genre}` : null,
            year ? `Año: ${year}` : null,
            rating ? `Calificación: ${rating}/10 ⭐` : null,
            'Audio: Español Latino',
            `Episodios: ${videos.length}`
        ].filter(Boolean).join(' | ')
    ].filter(p => p !== null).join('\n\n');

    return {
        id: `lacartoons:${serieId}`,
        type: 'series',
        name: title,
        genres: genre ? [genre] : [],
        poster: poster,
        background: background,
        logo: poster,
        posterShape: 'poster',
        releaseInfo: year,
        description: descParts,
        videos: videos
    };
}

// Cubeembed decryption helper
let cubeEmbedHelperCached = null;

async function getCubeEmbedDecryptor() {
    if (cubeEmbedHelperCached) return cubeEmbedHelperCached;

    const embedHtml = await fetchText('https://cubeembed.rpmvid.com/');
    const jsMatch = embedHtml.match(/src=["'](\/assets\/index-[^"']+\.js)["']/i);
    const jsPath = jsMatch ? jsMatch[1] : '/assets/index-B82x0F06.js';
    const jsContent = await fetchText(`https://cubeembed.rpmvid.com${jsPath}`);

    const iifeStart = jsContent.lastIndexOf('(function(', jsContent.lastIndexOf('Va,330605'));
    const feEnd = jsContent.indexOf('(async function()', iifeStart);
    const helperCode = jsContent.slice(iifeStart, feEnd);

    const startP = jsContent.indexOf('P=x=>{const p=fe');
    const endK = jsContent.indexOf('return Y(k)},', startP) + 'return Y(k)}'.length;
    const decryptFunctions = 'var ' + jsContent.slice(startP, endK);

    cubeEmbedHelperCached = { helperCode, decryptFunctions };
    return cubeEmbedHelperCached;
}

async function decryptCubeembed(videoId, rawHex) {
    const { helperCode, decryptFunctions } = await getCubeEmbedDecryptor();

    const mockWindow = {
        location: {
            protocol: 'https:',
            hash: `#${videoId}`
        },
        crypto: globalThis.crypto,
        TextEncoder: globalThis.TextEncoder,
        TextDecoder: globalThis.TextDecoder
    };

    const fn = new Function('window', 'rawHex', `
        var location = window.location;
        var crypto = window.crypto;
        var TextEncoder = window.TextEncoder;
        var TextDecoder = window.TextDecoder;
        ${helperCode}
        ${decryptFunctions}
        return K(rawHex);
    `);

    const result = await fn(mockWindow, rawHex);
    return JSON.parse(result);
}

// Extract raw stream info from an episode page
async function getRawStreams(capituloId, seasonNum = 1) {
    const url = `${BASE_URL}/serie/capitulo/${capituloId}?t=${seasonNum}`;
    const html = await fetchText(url);

    const iframes = [...html.matchAll(/<iframe[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
    const rawStreams = [];

    for (const iframeUrl of iframes) {
        try {
            // Cubeembed handler
            if (iframeUrl.includes('cubeembed.rpmvid.com')) {
                const hashMatch = iframeUrl.match(/#([a-zA-Z0-9_-]+)/);
                if (hashMatch) {
                    const videoId = hashMatch[1];
                    const apiUrl = `https://cubeembed.rpmvid.com/api/v1/video?id=${videoId}&w=1920&h=1080&r=www.lacartoons.com`;
                    const rawData = await fetchText(apiUrl, {
                        'Referer': 'https://cubeembed.rpmvid.com/',
                        'Origin': 'https://cubeembed.rpmvid.com'
                    });

                    const data = await decryptCubeembed(videoId, rawData);

                    if (data.cfNative) {
                        rawStreams.push({
                            type: 'hls',
                            name: 'LACartoons',
                            title: '1080p Full HD (HLS Latino)',
                            targetUrl: data.cfNative,
                            referer: 'https://cubeembed.rpmvid.com/'
                        });
                    }
                }
            }

            // OK.ru handler
            if (iframeUrl.includes('ok.ru')) {
                const okHtml = await fetchText(iframeUrl);
                const match = okHtml.match(/data-options=["']([^"']+)["']/i);
                if (match) {
                    const decoded = match[1]
                        .replace(/&quot;/g, '"')
                        .replace(/&amp;/g, '&')
                        .replace(/&#39;/g, "'");

                    const data = JSON.parse(decoded);
                    let meta = data.flashvars?.metadata;
                    if (typeof meta === 'string') meta = JSON.parse(meta);

                    if (meta && Array.isArray(meta.videos) && meta.videos.length > 0) {
                        const QUALITY_MAP = {
                            'ultra': { rank: 1, label: '4K Ultra HD (MP4 Latino)' },
                            'quad': { rank: 2, label: '1440p QHD (MP4 Latino)' },
                            'full': { rank: 3, label: '1080p Full HD (MP4 Latino)' },
                            'hd': { rank: 4, label: '720p HD (MP4 Latino)' },
                            'sd': { rank: 5, label: '480p SD (MP4 Latino)' },
                            'low': { rank: 6, label: '360p (MP4 Latino)' },
                            'lowest': { rank: 7, label: '240p (MP4 Latino)' },
                            'mobile': { rank: 8, label: '144p Mobile (MP4 Latino)' }
                        };

                        // Sort by quality (lowest rank number = highest resolution)
                        const sortedVideos = [...meta.videos].sort((a, b) => {
                            const rankA = QUALITY_MAP[a.name.toLowerCase()]?.rank || 99;
                            const rankB = QUALITY_MAP[b.name.toLowerCase()]?.rank || 99;
                            return rankA - rankB;
                        });

                        // Select ONLY the highest quality available
                        const bestVideo = sortedVideos[0];
                        if (bestVideo) {
                            const qInfo = QUALITY_MAP[bestVideo.name.toLowerCase()];
                            const label = qInfo ? qInfo.label : `${bestVideo.name.toUpperCase()} (MP4 Latino)`;
                            rawStreams.push({
                                type: 'video',
                                name: 'LACartoons',
                                title: label,
                                targetUrl: bestVideo.url,
                                referer: iframeUrl
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`Error extracting stream from ${iframeUrl}:`, err.message);
        }
    }

    return rawStreams;
}

module.exports = {
    CATEGORIES,
    getCatalog,
    getMeta,
    getRawStreams
};
