const HOME_URL = "https://cinefreak.net/";
const DUAL_AUDIO_URL = "https://cinefreak.net/dual-audio/";

const CATEGORIES = [
  { id: "dual-audio", name: "Dual Audio", url: DUAL_AUDIO_URL },
  // add more, e.g.:
  // { id: "south", name: "South Movies", url: "https://cinefreak.net/south/" },
  // { id: "hindi", name: "Hindi", url: "https://cinefreak.net/hindi/" },
];

/* ---------- helpers (unchanged) ---------- */
function decodeEntities(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) =>
      String.fromCharCode(parseInt(c, 16))
    );
}

function absoluteUrl(url = "") {
  const value = decodeEntities(url.trim());
  if (!value || value.startsWith("data:")) return "";
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
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function getImage(card) {
  const match = card.match(/<img\b[^>]*>/i);
  const imageTag = match?.[0] || "";
  return absoluteUrl(
    getAttribute(imageTag, [
      "data-src",
      "data-lazy-src",
      "data-original",
      "src",
    ])
  );
}

function getFirstLink(html) {
  const match = html.match(/<a\b[^>]*>/i);
  return absoluteUrl(getAttribute(match?.[0] || "", ["href"]));
}

function getCardTitle(card) {
  const titleMatch = card.match(
    /<[^>]*class=["'][^"']*movie-card-title[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
  );
  if (titleMatch?.[1]) return getText(titleMatch[1]);

  const imageTag = card.match(/<img\b[^>]*>/i)?.[0] || "";
  return getAttribute(imageTag, ["alt", "title"]) || "";
}

function extractCards(html, source = "cinefreak") {
  const cards = [];
  const cardRegex =
    /<div\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bmovie-card\b)[^>]*>[\s\S]*?(?=<div\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bmovie-card\b)|$)/gi;

  for (const match of html.matchAll(cardRegex)) {
    const card = match[0];
    const url = getFirstLink(card);
    const title = getCardTitle(card);
    const poster = getImage(card);

    const qualityMatch = card.match(
      /<[^>]*class=["'][^"']*quality-badges[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
    );

    if (!url || !title) continue;

    cards.push({
      id: url,
      title,
      slug: url.replace(/\/+$/, "").split("/").pop() || "",
      url,
      poster,
      thumbnail: poster,
      quality: getText(qualityMatch?.[1] || ""),
      source,
    });
  }

  return cards.filter(
    (movie, index, all) =>
      all.findIndex((item) => item.url === movie.url) === index
  );
}

function extractFeatured(html) {
  const featured = [];
  const slideRegex =
    /<[^>]+\bclass\s*=\s*["'][^"']*\bcine-slide\b[^"']*["'][^>]*>[\s\S]*?(?=<[^>]+\bclass\s*=\s*["'][^"']*\bcine-slide\b[^"']*["'][^>]*>|$)/gi;

  for (const match of html.matchAll(slideRegex)) {
    const slide = match[0];
    const url = getFirstLink(slide);
    const poster = getImage(slide);

    const headingMatch = slide.match(
      /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i
    );
    const title =
      getText(headingMatch?.[1] || "") ||
      getAttribute(slide.match(/<img\b[^>]*>/i)?.[0] || "", ["alt", "title"]);

    if (!url || !title) continue;

    featured.push({
      id: url,
      title,
      url,
      poster,
      thumbnail: poster,
      source: "cinefreak",
    });
  }

  return featured;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/html" },
  });
  if (!response.ok) {
    throw new Error(`CineFreak request failed: HTTP ${response.status} (${url})`);
  }
  return response.text();
}

/* ---------- Home ---------- */

async function getHome() {
  const homeHtml = await fetchPage(HOME_URL);

  // Fetch all categories in parallel
  const categoryPages = await Promise.all(
    CATEGORIES.map(async (cat) => {
      try {
        const html =
          cat.url === HOME_URL ? homeHtml : await fetchPage(cat.url);
        return { cat, items: extractCards(html, "cinefreak") };
      } catch {
        return { cat, items: [] };
      }
    })
  );

  const sections = categoryPages
    .filter(({ items }) => items.length > 0)
    .map(({ cat, items }) => ({
      id: cat.id,
      title: cat.name,
      url: cat.url,
      items,
    }));

  return {
    source: "cinefreak",
    name: "CineFreak",
    featured: extractFeatured(homeHtml),
    sections,
    categories: CATEGORIES,
  };
}

/* ---------- Category (See All) ---------- */

async function getCategory(categoryId, page = 1) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) {
    return { results: [], total: 0, page, hasMore: false };
  }

  // If your site uses ?page=N for pagination, adjust here.
  const url = page > 1 ? `${cat.url}?page=${page}` : cat.url;
  const html = await fetchPage(url);
  const items = extractCards(html, "cinefreak");

  return {
    results: items,
    total: items.length,
    page,
    hasMore: false, // set true if the site exposes a next page
  };
}

/* ---------- Search ---------- */

async function search(query, page = 1) {
  const q = String(query || "").trim();
  if (!q) return { results: [], total: 0, page: 1, hasMore: false };

  const url = `${HOME_URL}?s=${encodeURIComponent(q)}&page=${page}`;
  const html = await fetchPage(url);
  const items = extractCards(html, "cinefreak");

  return {
    results: items,
    total: items.length,
    page,
    hasMore: false,
  };
}

export default {
  search,
  getHome,
  getCategory,
};
