import { sdk } from "./sdk.js";

const HOME_URL = "https://cinefreak.net/";
const SOURCE = "cinefreak";

/* =========================================================
   HOME CATEGORIES
   Each entry becomes its own row on the home screen.
   ========================================================= */
const CATEGORIES = [
  { id: "latest-releases", name: "Latest Releases", url: HOME_URL },

  /* Movies */
  { id: "dual-audio",     name: "Dual Audio",          url: "https://cinefreak.net/dual-audio/" },
  { id: "hindi-movies",   name: "Hindi Movies",        url: "https://cinefreak.net/hindi-movies/" },
  { id: "hindi-dubbed",   name: "Hindi Dubbed Movies", url: "https://cinefreak.net/hindi-dubbed-movies/" },
  { id: "english-movies", name: "English Movies",      url: "https://cinefreak.net/english-movies/" },
  { id: "bangla-movies",  name: "Bangla Movies",       url: "https://cinefreak.net/bangla-movies/" },
  { id: "bangla-dubbed",  name: "Bangla Dubbed",       url: "https://cinefreak.net/bangla-dubbed/" },
  { id: "tamil",          name: "Tamil",               url: "https://cinefreak.net/tamil/" },
  { id: "telugu",         name: "Telugu",              url: "https://cinefreak.net/telugu/" },
  { id: "malayalam",      name: "Malayalam",           url: "https://cinefreak.net/malayalam/" },
  { id: "kannada",        name: "Kannada",             url: "https://cinefreak.net/kannada/" },
  { id: "korean",         name: "Korean",              url: "https://cinefreak.net/korean/" },
  { id: "japanese",       name: "Japanese",            url: "https://cinefreak.net/japanese/" },
  { id: "chinese",        name: "Chinese",             url: "https://cinefreak.net/chinese/" },
  { id: "spanish",        name: "Spanish",             url: "https://cinefreak.net/spanish/" },
  { id: "indonesian",     name: "Indonesian",          url: "https://cinefreak.net/indonesian/" },
  { id: "animation",      name: "Animation",           url: "https://cinefreak.net/animation/" },

  /* Series / Shows */
  { id: "web-series",     name: "WEB-Series",          url: "https://cinefreak.net/web-series/" },
  { id: "k-drama",        name: "K-Drama",             url: "https://cinefreak.net/k-drama/" },

  /* Genre / Special */
  { id: "horror",         name: "Horror",              url: "https://cinefreak.net/horror/" },
  { id: "mcu",            name: "MCU",                 url: "https://cinefreak.net/mcu/" },

  { id: "others",         name: "Others",              url: "https://cinefreak.net/others/" },
];

/* =========================================================
   CARD EXTRACTION
   ========================================================= */

function extractPoster(outer) {
  const imgMatch = outer.match(/<img\b[^>]*>/i);
  if (!imgMatch) return "";
  return sdk.absolute(
    sdk.attr(imgMatch[0], [
      "data-src",
      "data-lazy-src",
      "data-original",
      "src",
    ]),
    HOME_URL
  );
}

function extractTitle(outer) {
  const titleBlock = outer.match(
    /<[^>]*class\s*=\s*["'][^"']*\bmovie-card-title\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
  );
  if (titleBlock?.[1]) {
    const txt = sdk.text(titleBlock[1]);
    if (txt) return txt;
  }

  const imgMatch = outer.match(/<img\b[^>]*>/i);
  if (imgMatch) {
    const alt = sdk.attr(imgMatch[0], ["alt", "title"]);
    if (alt) return alt;
  }

  return sdk.attr(outer, ["aria-label"]) || "";
}

function extractHref(outer) {
  const linkMatch = outer.match(/<a\b[^>]*>/i);
  return sdk.absolute(sdk.attr(linkMatch?.[0] || "", ["href"]), HOME_URL);
}

function extractQuality(outer) {
  const qualityBlock = outer.match(
    /<[^>]*class\s*=\s*["'][^"']*\bquality-badges\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (qualityBlock?.[1]) {
    const chips = [
      ...qualityBlock[1].matchAll(
        /<[^>]*class\s*=\s*["'][^"']*\bmovie-card-format\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi
      ),
    ]
      .map((m) => sdk.text(m[1]))
      .filter(Boolean);
    if (chips.length) return chips[0];
  }
  return "";
}

function extractCategories(outer) {
  const formats = outer.match(
    /<[^>]*class\s*=\s*["'][^"']*\bmovie-card-formats\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (!formats?.[1]) return [];

  return [
    ...formats[1].matchAll(
      /<[^>]*class\s*=\s*["'][^"']*\bmovie-card-format\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi
    ),
  ]
    .map((m) => sdk.text(m[1]))
    .filter(Boolean);
}

function extractCards(html) {
  const out = [];
  const seen = new Set();

  for (const { openTag, outer } of sdk.findByClass(html, "movie-card")) {
    const url = extractHref(outer) || extractHref(openTag);
    const title = extractTitle(outer);
    const poster = extractPoster(outer);

    if (!url || !title) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    out.push({
      id: url,
      title,
      slug: url.replace(/\/+$/, "").split("/").pop() || "",
      url,
      poster,
      thumbnail: poster,
      quality: extractQuality(outer),
      categories: extractCategories(outer),
      date: null,
      source: SOURCE,
    });
  }

  return out;
}

/* =========================================================
   HERO / FEATURED
   ========================================================= */

function extractFeatured(html) {
  const featured = [];
  const seen = new Set();

  const slideRegex =
    /<[^>]+\bclass\s*=\s*["'][^"']*\bcine-slide\b[^"']*["'][^>]*>[\s\S]*?(?=<[^>]+\bclass\s*=\s*["'][^"']*\bcine-slide\b[^"']*["'][^>]*>|<\/div>\s*<div\s+class="cine-nav-wrapper|$)/gi;

  for (const match of html.matchAll(slideRegex)) {
    const slide = match[0];

    const imgMatch = slide.match(/<img\b[^>]*>/i);
    if (!imgMatch) continue;

    const poster = sdk.absolute(
      sdk.attr(imgMatch[0], ["data-src", "src"]),
      HOME_URL
    );

    const titleMatch = slide.match(
      /<[^>]*class\s*=\s*["'][^"']*\bcine-slide-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    );

    const url = titleMatch?.[1]
      ? sdk.absolute(titleMatch[1], HOME_URL)
      : extractHref(slide);
    const title = titleMatch?.[2]
      ? sdk.text(titleMatch[2])
      : sdk.attr(imgMatch[0], ["alt", "title"]);

    if (!url || !title || !poster || seen.has(url)) continue;
    seen.add(url);

    const catMatch = slide.match(
      /<[^>]*class\s*=\s*["'][^"']*\bcine-tag-cat\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
    );

    featured.push({
      id: url,
      title,
      url,
      poster,
      thumbnail: poster,
      quality: "HD",
      categories: catMatch?.[1] ? [sdk.text(catMatch[1])] : [],
      source: SOURCE,
    });
  }

  return featured;
}

/* =========================================================
   PUBLIC API
   ========================================================= */

async function getHome() {
  const homeHtml = await sdk.fetchHtml(HOME_URL);

  // Fetch every non-homepage category in parallel
  const extraCats = CATEGORIES.filter((c) => c.url !== HOME_URL);
  const results = await Promise.allSettled(
    extraCats.map((c) => sdk.fetchHtml(c.url))
  );

  const sections = [];

  const latest = extractCards(homeHtml);
  if (latest.length) {
    sections.push({
      id: "latest-releases",
      title: "Latest Releases",
      url: HOME_URL,
      items: latest,
    });
  }

  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const cat = extraCats[i];
    const items = extractCards(r.value);
    if (!items.length) return;
    sections.push({
      id: cat.id,
      title: cat.name,
      url: cat.url,
      items,
    });
  });

  return {
    source: SOURCE,
    name: "CineFreak",
    featured: extractFeatured(homeHtml),
    sections,
    categories: CATEGORIES,
  };
}

async function getCategory(categoryId, page = 1) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return { results: [], total: 0, page, hasMore: false };

  let url = cat.url;
  if (page > 1) {
    url = cat.url.replace(/\/+$/, "") + `/page/${page}/`;
  }

  const html = await sdk.fetchHtml(url);
  const items = extractCards(html);
  const hasMore = /class\s*=\s*["'][^"']*\bnext\b[^"']*["']/i.test(html);

  return {
    results: items,
    total: items.length,
    page,
    hasMore,
  };
}

async function search(query, page = 1) {
  const q = String(query || "").trim();
  if (!q) return { results: [], total: 0, page: 1, hasMore: false };

  const url =
    page > 1
      ? `${HOME_URL}page/${page}/?s=${encodeURIComponent(q)}`
      : `${HOME_URL}?s=${encodeURIComponent(q)}`;

  const html = await sdk.fetchHtml(url);
  const items = extractCards(html);
  const hasMore = /class\s*=\s*["'][^"']*\bnext\b[^"']*["']/i.test(html);

  return {
    results: items,
    total: items.length,
    page,
    hasMore,
  };
}

export default {
  search,
  getHome,
  getCategory,
};
