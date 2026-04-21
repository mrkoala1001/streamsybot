const axios = require('axios');
const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

router.get('/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL missing');

    const isGoogle = targetUrl.includes('googleusercontent.com');
    const client = targetUrl.startsWith('https') ? https : http;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Referer': isGoogle ? '' : 'https://tv10.lk21official.cc/',
        },
        timeout: 20000
    };

    client.get(targetUrl, options, (response) => {
        if (response.statusCode >= 400) {
            console.error(`Proxy Error ${response.statusCode} for: ${targetUrl}`);
            res.status(response.statusCode).end();
            return;
        }

        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', response.headers['content-type'] || 'video/mp2t');
        if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);
        
        response.pipe(res);
    }).on('error', (e) => {
        console.error('Proxy Request Error:', e.message);
        res.status(500).end();
    });
});

// A specific proxy for m3u8 that rewrites inner TS chunks locally
router.get('/proxy-m3u8', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL missing');

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://tv10.lk21official.cc/'
            }
        });

        let m3u8Content = response.data;
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        
        const modifiedLines = m3u8Content.split('\n').map(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                let absoluteUrl = line.startsWith('http') ? line : baseUrl + line;
                if (absoluteUrl.includes('.m3u8')) {
                    return `/api/stream/proxy-m3u8?url=${encodeURIComponent(absoluteUrl)}`;
                }
                return `/api/stream/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            }
            if (line.startsWith('#EXT-X-KEY')) {
                 return line.replace(/URI="([^"]+)"/, (match, p1) => {
                     let absoluteUrl = p1.startsWith('http') ? p1 : baseUrl + p1;
                     return `URI="/api/stream/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
                 });
            }
            return line;
        });

        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(modifiedLines.join('\n'));

    } catch (e) {
        console.error('M3U8 Proxy Error:', e.message);
        res.status(500).send('M3U8 Proxy Error');
    }
});

// Proxy for images to bypass ORB/CORS
router.get('/proxy-image', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL missing');
    if (targetUrl.startsWith('//')) targetUrl = 'https:' + targetUrl;

    const client = targetUrl.startsWith('https') ? https : http;
    client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        response.pipe(res);
    }).on('error', () => res.status(500).end());
});

// A specific proxy for HTML pages to bypass CSP Frame-Ancestors
router.get('/proxy-page', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL missing');

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Referer': 'https://tv10.lk21official.cc/'
            }
        });

        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.set('Access-Control-Allow-Origin', '*');
        
        let html = response.data.toString('utf-8');
        const baseUrl = new URL(targetUrl).origin + '/';
        if (!html.includes('<base')) {
            html = html.replace('<head>', `<head><base href="${baseUrl}">`);
        }

        html = html.replace(/<iframe([^>]+)src="([^"]+)"/gi, (match, prefix, src) => {
            if (src.startsWith('javascript:')) return match;
            let absoluteUrl = src.startsWith('http') ? src : baseUrl + src;
            if (absoluteUrl.startsWith('//')) absoluteUrl = 'https:' + absoluteUrl;
            return `<iframe${prefix}src="/api/stream/proxy-page?url=${encodeURIComponent(absoluteUrl)}"`;
        });
        
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        console.error('HTML Proxy Error:', e.message);
        res.status(500).send('HTML Proxy Error');
    }
});

module.exports = router;
