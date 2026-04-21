const express = require('express');
const router = express.Router();
const { Scraper } = require('./scraper');

// Scrapers - Menggunakan domain utama yang paling stabil saat ini
const movieScraper = new Scraper('https://tv3.nontondrama.my/');

router.get('/search', async (req, res) => {
  const { s, page } = req.query;
  if (!s) return res.status(400).json({ error: 'Search query "s" is required' });
  
  try {
      const results = await movieScraper.search(s, page);
      const combined = results.filter(m => {
        if (!m.slug) return false;
        // Basic filter for junk
        if (!m.title.toLowerCase().includes(s.toLowerCase().substring(0, 3))) return false;
        return true;
      });

      res.json({ results: combined });
  } catch (err) {
      res.status(500).json({ error: 'Search failed' });
  }
});

// Category Endpoints
router.get('/:type/latest', async (req, res) => {
    const { page } = req.query;
    const results = await movieScraper.getLatest(page);
    res.json({ results });
});

router.get('/:type/popular', async (req, res) => {
    const { page } = req.query;
    const results = await movieScraper.getPopular(page);
    res.json({ results });
});

router.get('/movies/:slug', async (req, res) => {
  const { slug } = req.params;
  const result = await movieScraper.getDetail(slug);
  res.json({ result });
});

router.get('/movies/:slug/stream', async (req, res) => {
  const { slug } = req.params;
  const results = await movieScraper.getStreamLinks(slug);

  const { extractRawStream } = require('./unmasker');
  const enhancedResults = await Promise.all(results.map(async (s) => {
    if (s.url.includes('playeriframe.sbs') || s.url.includes('vidhide')) {
      const raw = await extractRawStream(s.url).catch(() => null);
      if (raw) return { ...s, url: raw, provider: `(UNMASKED) ${s.provider}` };
    }
    return s;
  }));

  res.json({ results: enhancedResults });
});

router.use('/stream', require('./proxy'));

module.exports = router;
