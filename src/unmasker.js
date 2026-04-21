const puppeteer = require('puppeteer');

let browserInstance = null;

async function getBrowser() {
    if (browserInstance && browserInstance.connected) return browserInstance;
    browserInstance = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    return browserInstance;
}

async function extractRawStream(url) {
    if (!url || !url.startsWith('http')) return null;

    console.log('Extracting:', url);
    const browser = await getBrowser();

    let page = null;
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

        let rawUrl = null;
        await page.setRequestInterception(true);
        page.on('request', request => {
            const reqUrl = request.url();
            if (reqUrl.includes('.m3u8')) {
                if (!rawUrl) {
                    console.log('MATCH! m3u8 found:', reqUrl);
                    rawUrl = reqUrl;
                }
            }
            request.continue();
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

        // Agresif: Hapus SEMUA elemen yang menutupi layar atau berpotensi jadi overlay iklan
        await page.evaluate(() => {
            const selectors = [
                '#overlay', '#uyeouyeo', '.ads-box', '.pop-under', '[id^="pop"]', 
                'div[style*="position: fixed"]', 'div[style*="z-index: 999"]',
                'div[style*="z-index: 2147483647"]', '.p2p-info', '.p2p-overlay'
            ];
            selectors.forEach(s => {
                document.querySelectorAll(s).forEach(el => {
                    try { el.remove(); } catch(e) {}
                });
            });
            // Hapus juga div transparan besar yang biasanya menutupi seluruh layar
            document.querySelectorAll('div').forEach(div => {
                const style = window.getComputedStyle(div);
                if (style.position === 'fixed' && (parseInt(style.zIndex) > 100 || style.width === '100%')) {
                    div.remove();
                }
            });
        });

        // Strategi Klik Terkoordinasi: Klik tengah, lalu geser dikit klik lagi
        await page.mouse.click(640, 360); // Klik Tengah
        await new Promise(r => setTimeout(r, 800));
        await page.mouse.click(600, 300); // Klik agak meleset dikit (buat pancingan)
        await new Promise(r => setTimeout(r, 800));
        await page.mouse.click(640, 360); // Klik Tengah lagi
        
        // Sniffer Wait: Beri waktu lebih lama bagi video untuk melakukan buffering awal
        for(let i=0; i<30; i++) {
            if(rawUrl) break;
            await new Promise(r => setTimeout(r, 500));
        }

        return rawUrl;
    } catch (e) {
        console.error('Extraction Error:', e.message);
        return null;
    } finally {
        if (page) await page.close().catch(() => {});
    }
}

module.exports = { extractRawStream };
