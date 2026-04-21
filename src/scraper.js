const axios = require('axios');
const cheerio = require('cheerio');

class Scraper {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchHtml(path) {
    try {
      const cleanBase = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${cleanBase}${cleanPath}`;
      
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'Referer': cleanBase + '/'
        },
        timeout: 15000
      });
      return data;
    } catch (error) {
      console.error(`[FETCH ERROR] ${error.message} - URL: ${this.baseUrl}${path}`);
      return null;
    }
  }

  parseList($) {
    const results = [];
    $('article, .gmr-item').each((i, el) => {
      const title = $(el).find('.poster-title, .entry-title, h2, h3').first().text().trim();
      const slug = $(el).find('a').attr('href')?.split('/').filter(Boolean).pop();
      const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

      if (title && slug) {
        results.push({ title, slug, poster });
      }
    });
    return results;
  }

  async getLatest(page = 1) {
    const html = await this.fetchHtml(page > 1 ? `/page/${page}/` : '/');
    if (!html) return [];
    return this.parseList(cheerio.load(html));
  }

  async getPopular(page = 1) {
    const html = await this.fetchHtml(`/populer/page/${page}/`);
    if (!html) return this.getLatest(page);
    return this.parseList(cheerio.load(html));
  }

  async search(query, page = 1) {
    const html = await this.fetchHtml(`/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`);
    if (!html) return [];
    return this.parseList(cheerio.load(html));
  }

  async getDetail(slug) {
    const html = await this.fetchHtml(`/${slug}/`);
    if (!html) return null;
    const $ = cheerio.load(html);
    
    let title = $('.entry-title, h1').first().text().trim();
    let poster = $('.poster img, .gmr-poster img').first().attr('src');
    let description = $('.entry-content p, .gmr-moviedesc').first().text().trim();
    
    const seasons = [];
    const episodes = [];

    // Debugging (Internal)
    console.log(`[DEBUG] Parsing Series: ${title} | Slug: ${slug}`);

    // TRICK 1: Check for JSON data in #season-data (Newest LK21/NontonDrama format)
    const seasonDataJson = $('#season-data').html();
    if (seasonDataJson) {
        try {
            const data = JSON.parse(seasonDataJson);
            // 'data' usually looks like: { "1": [{episode_no: 1, slug: "..."}, ...], "2": [...] }
            Object.keys(data).forEach(sNum => {
                seasons.push({ 
                    name: `Season ${sNum}`, 
                    slug: data[sNum][0].slug.replace(/-episode-\d+/, '') // Base slug for season
                });
                
                // Add episodes (if it's a specific season, we could filter, but let's take all or Season 1)
                data[sNum].forEach(ep => {
                    episodes.push({
                        episode: ep.episode_no.toString(),
                        slug: ep.slug,
                        season: sNum
                    });
                });
            });
        } catch (e) {
            console.error("[SCRAPER] Failed to parse #season-data JSON");
        }
    }

    // TRICK 2: Fallback to old school scraping if JSON not found
    if (seasons.length === 0) {
        $('.season-list select option, .gmr-listseason select option, #gmr-sel-season option').each((i, el) => {
            const name = $(el).text().trim();
            const value = $(el).attr('value') || $(el).val();
            if (value && value !== '#' && value !== '0') {
                seasons.push({ name, slug: value.split('/').filter(Boolean).pop() });
            }
        });
    }

    if (episodes.length === 0) {
        // AGGRESSIVE EPISODE SCAN 2.0
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (!href) return;
            
            const epPattern = href.match(/-(?:episode|eps|ep)-(\d+)(?:-|$)/i);
            const epTextPattern = text.match(/^\d+$/); 
            
            if (epPattern || epTextPattern) {
                const epNum = epPattern ? epPattern[1] : epTextPattern[0];
                const num = parseInt(epNum);
                if (num > 0 && num < 500 && !episodes.some(e => e.episode === epNum)) {
                    episodes.push({
                        episode: epNum,
                        slug: href.split('/').filter(Boolean).pop()
                    });
                }
            }
        });

        // Fallback: Standar list
        if (episodes.length === 0) {
            $('.mob-list-eps a, .episode-list a, .gmr-listepisode a, .muvipro-list-eps a, .box-episode a').each((i, el) => {
                const text = $(el).text().trim();
                const epNum = text.match(/\d+/);
                if (epNum && parseInt(epNum[0]) < 500) {
                    episodes.push({ 
                        episode: epNum[0], 
                        slug: $(el).attr('href')?.split('/').filter(Boolean).pop() 
                    });
                }
            });
        }
    }

    // Sort episodes correctly (Season dulu, baru Nomor Episode)
    episodes.sort((a, b) => {
        if (parseInt(a.season) !== parseInt(b.season)) {
            return parseInt(a.season) - parseInt(b.season);
        }
        return parseInt(a.episode) - parseInt(b.episode);
    });

    // If no seasons but have episodes, add dummy season
    if (seasons.length === 0 && episodes.length > 0) {
        seasons.push({ name: 'Season 1', slug });
    }

    console.log(`[DEBUG] Found ${seasons.length} Seasons, ${episodes.length} Episodes`);

    return { title, poster, description, seasons, episodes, slug };
  }

  async getStreamLinks(slug) {
    try {
      const html = await this.fetchHtml(`/${slug}/`);
      if (!html) return [];
      const $ = cheerio.load(html);
      const streams = [];

      $('option[data-server], .gmr-embed-checkbox option').each((i, el) => {
          let url = $(el).attr('value') || $(el).val() || $(el).attr('data-url');
          if (!url || url === '#' || url === '0') return;
          if (url.startsWith('//')) url = 'https:' + url;
          streams.push({ provider: ($(el).attr('data-server') || $(el).text()).toUpperCase().trim(), url });
      });

      if (streams.length === 0) {
          $('iframe[src]').each((i, el) => {
              let url = $(el).attr('src');
              if (url && (url.includes('player') || url.includes('embed'))) {
                  if (url.startsWith('//')) url = 'https:' + url;
                  streams.push({ provider: 'MIRROR', url });
              }
          });
      }

      return Array.from(new Set(streams.map(JSON.stringify))).map(JSON.parse);
    } catch (e) { return []; }
  }
}

module.exports = { Scraper };
