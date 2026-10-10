const HOME_URL = "https://cinefreak.net/";

/* =========================================================
   HOME CATEGORIES
   Every entry here becomes its own row on the home screen.
   Add / remove / reorder freely — the UI picks them up
   automatically and wires up "See All" pagination.
   ========================================================= */
const CATEGORIES = [
  { id: "latest-releases", name: "Latest Releases", url: HOME_URL },

  /* Movies */
  { id: "dual-audio",          name: "Dual Audio",           url: "https://cinefreak.net/dual-audio/" },
  { id: "hindi-movies",        name: "Hindi Movies",         url: "https://cinefreak.net/hindi-movies/" },
  { id: "hindi-dubbed",        name: "Hindi Dubbed Movies",  url: "https://cinefreak.net/hindi-dubbed-movies/" },
  { id: "english-movies",      name: "English Movies",       url: "https://cinefreak.net/english-movies/" },
  { id: "bangla-movies",       name: "Bangla Movies",        url: "https://cinefreak.net/bangla-movies/" },
  { id: "bangla-dubbed",       name: "Bangla Dubbed",        url: "https://cinefreak.net/bangla-dubbed/" },
  { id: "tamil",               name: "Tamil",                url: "https://cinefreak.net/tamil/" },
  { id: "telugu",              name: "Telugu",               url: "https://cinefreak.net/telugu/" },
  { id: "malayalam",           name: "Malayalam",            url: "https://cinefreak.net/malayalam/" },
  { id: "kannada",             name: "Kannada",              url: "https://cinefreak.net/kannada/" },
  { id: "korean",              name: "Korean",               url: "https://cinefreak.net/korean/" },
  { id: "japanese",            name: "Japanese",             url: "https://cinefreak.net/japanese/" },
  { id: "chinese",             name: "Chinese",              url: "https://cinefreak.net/chinese/" },
  { id: "spanish",             name: "Spanish",              url: "https://cinefreak.net/spanish/" },
  { id: "indonesian",          name: "Indonesian",           url: "https://cinefreak.net/indonesian/" },
  { id: "animation",           name: "Animation",            url: "https://cinefreak.net/animation/" },

  /* Series / Shows */
  { id: "web-series",          name: "WEB-Series",           url: "https://cinefreak.net/web-series/" },
  { id: "k-drama",             name: "K-Drama",              url: "https://cinefreak.net/k-drama/" },

  /* Genre / Special */
  { id: "horror",              name: "Horror",               url: "https://cinefreak.net/horror/" },
  { id: "mcu",                 name: "MCU",                  url: "https://cinefreak.net/mcu/" },

  /* "Others" last */
  { id: "others",              name: "Others",               url: "https://cinefreak.net/others/" },
];

/* =========================================================
   HTML HELPERS
   ========================================================= */

function decodeEntities(text = "") {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) =>
      String.fromCharCode(parseInt(c, 16))
    );
}

function absoluteUrl(url = "") {
  const value = decodeEntities(String(url).trim());
  if (!value || value.startsWith("data:") || value.startsWith("javascript:")) {
    return "";
  }
  try {
    return new URL(value, HOME_URL).href;
  } catch {
    return "";
  }
}

function getAttribute(tag = "", names = []) {
  for (const name of names) {
    const regex = new RegExp(
      `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i"
    );
    const match = tag.match(regex);
    const value = match?.[1] ?? match?.[2] ?? match?.[3];
    if (value) return decodeEntities(value);
  }
  return "";
}

function getText(html = "") {
  return decodeEntities(
    String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/* =========================================================
   CARD EXTRACTION
   ========================================================= */

/**
 * Find every element with class "movie-card".
 * The site uses <a class="movie-card">…</a>, so we match any
 * tag name and walk nested same-tag elements correctly.
 */
function findCards(html) {
  const cards = [];
  const opener =
    /<([a-zA-Z][\w-]*)\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bmovie-card\b)[^>]*>/gi;

  let match;
  while ((match = opener.exec(html)) !== null) {
    const tagName = match[1];
    const startIdx = match.index;
    const openEnd = match.index + match[0].length;

    let depth = 1;
    let cursor = openEnd;
    let closeEnd = -1;

    while (depth > 0) {
      const nextOpen = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
      nextOpen.lastIndex = cursor;
      const nextClose = new RegExp(`</${tagName}\\s*>`, "gi");
      nextClose.lastIndex = cursor;

      const o = nextOpen.exec(html);
      const c = nextClose.exec(html);

      if (!c) break;

      if (o && o.index < c.index) {
        depth++;
        cursor = o.index + o[0].length;
      } else {
        depth--;
        cursor = c.index + c[0].length;
        if (depth === 0) closeEnd = cursor;
      }
    }

    if (closeEnd === -1) continue;

    cards.push({
      openTag: match[0],
      outer: html.slice(startIdx, closeEnd),
    });
  }

  return cards;
}

function extractPoster(outer) {
  const imgMatch = outer.match(/<img\b[^>]*>/i);
  if (!imgMatch) return "";
  return absoluteUrl(
    getAttribute(imgMatch[0], [
      "data-src",
      "data-lazy-src",
      "data-original",
      "src",
    ])
  );
}

function extractTitle(outer) {
  const titleBlock = outer.match(
    /<[^>]*class\s*=\s*["'][^"']*\bmovie-card-title\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
  );
  if (titleBlock?.[1]) {
    const txt = getText(titleBlock[1]);
    if (txt) return txt;
  }

  const imgMatch = outer.match(/<img\b[^>]*>/i);
  if (imgMatch) {
    const alt = getAttribute(imgMatch[0], ["alt", "title"]);
    if (alt) return alt;
  }

  return getAttribute(outer, ["aria-label"]) || "";
}

function extractHref(outer) {
  const linkMatch = outer.match(/<a\b[^>]*>/i);
  return absoluteUrl(getAttribute(linkMatch?.[0] || "", ["href"]));
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
      .map((m) => getText(m[1]))
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
    .map((m) => getText(m[1]))
    .filter(Boolean);
}

function extractCards(html, source = "cinefreak") {
  const out = [];
  const seen = new Set();

  for (const { openTag, outer } of findCards(html)) {
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
      source,
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

    const poster = absoluteUrl(
      getAttribute(imgMatch[0], ["data-src", "src"])
    );

    const titleMatch = slide.match(
      /<[^>]*class\s*=\s*["'][^"']*\bcine-slide-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    );

    const url = titleMatch?.[1]
      ? absoluteUrl(titleMatch[1])
      : extractHref(slide);
    const title = titleMatch?.[2]
      ? getText(titleMatch[2])
      : getAttribute(imgMatch[0], ["alt", "title"]);

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
      categories: catMatch?.[1] ? [getText(catMatch[1])] : [],
      source: "cinefreak",
    });
  }

  return featured;
}

/* =========================================================
   HTTP
   ========================================================= */

async function fetchPage(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/html" },
  });
  if (!response.ok) {
    throw new Error(
      `CineFreak request failed: HTTP ${response.status} (${url})`
    );
  }
  return response.text();
}

/* =========================================================
   PUBLIC API
   ========================================================= */

async function getHome() {
  const homeHtml = await fetchPage(HOME_URL);

  // Fetch every non-homepage category in parallel
  const extraCats = CATEGORIES.filter((c) => c.url !== HOME_URL);
  const results = await Promise.allSettled(
    extraCats.map((c) => fetchPage(c.url))
  );

  const sections = [];

  // Latest Releases from the homepage
  const latest = extractCards(homeHtml, "cinefreak");
  if (latest.length) {
    sections.push({
      id: "latest-releases",
      title: "Latest Releases",
      url: HOME_URL,
      items: latest,
    });
  }

  // Every other category that returned items
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const cat = extraCats[i];
    const items = extractCards(r.value, "cinefreak");
    if (!items.length) return;
    sections.push({
      id: cat.id,
      title: cat.name,
      url: cat.url,
      items,
    });
  });

  return {
    source: "cinefreak",
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

  const html = await fetchPage(url);
  const items = extractCards(html, "cinefreak");
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

  const html = await fetchPage(url);
  const items = extractCards(html, "cinefreak");
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
