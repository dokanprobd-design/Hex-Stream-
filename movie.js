const HOME_URL = "https://cinefreak.net/";

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

function stripTags(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* =========================================================
   JSON-LD
   ========================================================= */

function extractJsonLd(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];

  for (const b of blocks) {
    try {
      const data = JSON.parse(decodeEntities(b[1]));
      const graph = data["@graph"] || [data];
      for (const node of graph) {
        if (
          node["@type"] === "Article" ||
          (Array.isArray(node["@type"]) && node["@type"].includes("Article"))
        ) {
          return node;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return null;
}

/* =========================================================
   META TAGS (og:image, og:description, etc.)
   ========================================================= */

function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]+content\\s*=\\s*["']([^"']*)["']`,
    "i"
  );
  const m1 = html.match(re);
  if (m1) return decodeEntities(m1[1]);

  const re2 = new RegExp(
    `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]+(?:property|name)\\s*=\\s*["']${prop}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? decodeEntities(m2[1]) : "";
}

/* =========================================================
   TITLE CLEANING
   ========================================================= */

/**
 * "Animals (2026) Dual Audio [Hindi & English] WEB-DL 480p, 720p,
 *  1080p & 4K-2160p | HEVC | Full Movie Download..." 
 *   → "Animals (2026)"
 */
function cleanTitle(rawTitle) {
  if (!rawTitle) return "";
  let t = decodeEntities(rawTitle);
  // Drop anything after the year+parenthesis
  const m = t.match(/^(.+?\(\d{4}\).*?)(?:\s+(?:Dual|Hindi|English|WEB|WEBRip|BluRay|HDTC|HDRip|HDCAM|PreDVD|HDTS|\d{3,4}p|HEVC|Full|Download|Watch|S\d+|Season)\b)/i);
  if (m) t = m[1];
  // Fallback: cut at first pipe
  t = t.split("|")[0].trim();
  return t;
}

/* =========================================================
   POSTER
   ========================================================= */

function extractPoster(html) {
  // Prefer og:image (usually a full-size poster)
  const og = metaContent(html, "og:image");
  if (og && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(og)) return absoluteUrl(og);

  // Fall back to the poster block in the page body
  const posterMatch = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*\bposter-image\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*>/i
  );
  if (posterMatch) {
    const img = posterMatch[0].match(/<img\b[^>]*>/i);
    if (img) {
      return absoluteUrl(
        getAttribute(img[0], ["data-src", "src", "data-lazy-src"])
      );
    }
  }

  // Last resort: first img in the page with "tmdb" or "poster" in src
  const imgAll = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgAll) {
    const src = getAttribute(tag, ["src", "data-src"]);
    if (/tmdb|poster|cineimg/i.test(src) && !/logo|icon|avatar/i.test(src)) {
      return absoluteUrl(src);
    }
  }
  return "";
}

/* =========================================================
   BACKDROP (hero image, 1280 wide)
   ========================================================= */

function extractBackdrop(html) {
  // The player box ships the hero as a background-image
  const bgMatch = html.match(
    /id=["']cfClickPlay["'][^>]+style\s*=\s*["'][^"']*background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/i
  );
  if (bgMatch) return absoluteUrl(bgMatch[1]);

  // Or the trailer screen background
  const trailerBg = html.match(
    /class=["']cft-start["'][^>]+style\s*=\s*["'][^"']*url\(['"]?([^'")]+)['"]?\)/i
  );
  if (trailerBg) return absoluteUrl(trailerBg[1]);

  return extractPoster(html);
}

/* =========================================================
   METADATA (IMDb, genres, runtime, country, language, etc.)
   ========================================================= */

function parseMeta(html) {
  const out = {
    imdb: "",
    imdbUrl: "",
    releaseDate: "",
    runtime: "",
    country: "",
    language: "",
    subtitle: "",
    qualityList: "",
    videoFormat: "",
    genres: [],
    network: "",
  };

  // The metadata block is a series of <b>Label:</b> value<br> lines
  const metaBlockMatch = html.match(
    /Movie Details[\s\S]{0,50}?:[\s\S]*?<\/h[1-6]>([\s\S]*?)(?:<h[1-6]|<\/div>)/i
  );
  const block = metaBlockMatch ? metaBlockMatch[1] : html;

  const getValue = (label) => {
    const re = new RegExp(
      `<b>\\s*${label}\\s*:?\\s*<\\/b>\\s*([\\s\\S]*?)(?:<br\\s*\\/?>|$)`,
      "i"
    );
    const m = block.match(re);
    return m ? getText(m[1]) : "";
  };

  // IMDb rating + link
  const imdbMatch = block.match(
    /<a[^>]+href\s*=\s*["'](https?:\/\/(?:www\.)?imdb\.com\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
  );
  if (imdbMatch) {
    out.imdbUrl = decodeEntities(imdbMatch[1]);
    out.imdb = getText(imdbMatch[2]).replace(/^⭐\s*IMDb Rating:?\s*/i, "").trim();
  } else {
    out.imdb = getValue("IMDb Rating").replace(/^⭐\s*/, "");
  }

  out.releaseDate = getValue("Release Date");
  out.runtime = getValue("Runtime");
  out.country = getValue("Country");
  out.language = getValue("Language");
  out.subtitle = getValue("Subtitle");
  out.qualityList = getValue("Quality");
  out.videoFormat = getValue("Video Format");

  // Genres — from JSON-LD or from the badge row
  const ld = extractJsonLd(html);
  if (ld && ld.articleSection) {
    out.genres = String(ld.articleSection)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!out.genres.length) {
    // Badges: <span class="badge badge-outline"><a href="/genre/crime/">Crime</a></span>
    const genreMatches = [
      ...html.matchAll(
        /<span[^>]*class\s*=\s*["'][^"']*badge-outline[^"']*["'][^>]*>[\s\S]*?<a[^>]+href\s*=\s*["'][^"']*\/genre\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi
      ),
    ];
    out.genres = genreMatches.map((m) => getText(m[1])).filter(Boolean);
  }

  // Network / OTT — badge links to /ott/<name>/
  const ottMatch = html.match(
    /<span[^>]*class\s*=\s*["'][^"']*badge-outline[^"']*["'][^>]*>[\s\S]*?<a[^>]+href\s*=\s*["'][^"']*\/ott\/([^"'\/]+)\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
  );
  if (ottMatch) out.network = getText(ottMatch[2]);

  return out;
}

/* =========================================================
   SYNOPSIS / PLOT
   ========================================================= */

function extractSynopsis(html) {
  const synMatch = html.match(
    /Plot Summary\s*\/?\s*Storyline\s*:?[\s\S]*?<\/h[1-6]>([\s\S]*?)(?:<h[1-6]|<\/div>)/i
  );
  if (synMatch) {
    const text = stripTags(synMatch[1]).trim();
    if (text) return text;
  }

  // Fall back to og:description
  const desc = metaContent(html, "og:description");
  return desc || "";
}

/* =========================================================
   TRAILER
   ========================================================= */

function extractTrailer(html) {
  const ytMatch =
    html.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i) ||
    html.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i) ||
    html.match(/data-yt=["']([a-zA-Z0-9_-]{11})["']/i);
  if (!ytMatch) return { youtubeId: "", url: "" };
  return {
    youtubeId: ytMatch[1],
    url: `https://www.youtube.com/watch?v=${ytMatch[1]}`,
  };
}

/* =========================================================
   SCREENSHOTS
   ========================================================= */

function extractScreenshots(html) {
  const shots = [];
  const seen = new Set();

  const block = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*screenshot-container[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<center>/i
  );
  const scope = block ? block[1] : html;

  for (const m of scope.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = absoluteUrl(
      getAttribute(tag, ["data-src", "src", "data-lazy-src"])
    );
    if (!src || !/cineimg|image\.tmdb/i.test(src)) continue;
    if (seen.has(src)) continue;
    seen.add(src);
    shots.push(src);
  }

  return shots;
}

/* =========================================================
   DOWNLOAD LINKS
   ========================================================= */

function extractDownloads(html) {
  const groups = [];

  // Each download block looks like:
  //   <h4 class="movie-title">
  //     Title <span>[lang]</span> 480p [420 MB]
  //   </h4>
  //   <div class="dlbtn-container">
  //     <a href="…/f/<id>" class="dlbtn dlbtn-download" data-hevc="1" data-hq="1080p HEVC" data-hs="1.8 GB" data-alt="…" data-aq="1080p" data-as="2.3 GB">…</a>
  //     <a href="…/x/<id>" class="dlbtn dlbtn-watch">Watch Online</a>
  //   </div>
  const blockRegex =
    /<h4[^>]*class\s*=\s*["'][^"']*\bmovie-title\b[^"']*["'][^>]*>([\s\S]*?)<\/h4>\s*<div[^>]*class\s*=\s*["'][^"']*\bdlbtn-container\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;

  for (const m of html.matchAll(blockRegex)) {
    const label = getText(m[1]);
    const container = m[2];

    // Parse quality + size out of the label, e.g.
    //   "Animals (2026) [Hindi & English] HEVC 720p [820 MB]"
    //   "Animals (2026) [Hindi & English] 4K-2160p HDR HEVC [12.8 GB]"
    const qMatch = label.match(
      /\b(\d{3,4}p|4K-?2160p|4K)\b/i
    );
    const sizeMatch = label.match(/\[([\d.]+\s*(?:MB|GB|KB))\]/i);

    const quality = qMatch ? qMatch[1] : "";
    const size = sizeMatch ? sizeMatch[1] : "";

    // Extract link(s)
    let download = null;
    let watch = null;
    let hevc = null;

    const linkRegex = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
    for (const linkMatch of container.matchAll(linkRegex)) {
      const linkHtml = linkMatch[0];
      const openTag = linkHtml.match(/<a\b[^>]*>/i)?.[0] || "";
      const href = absoluteUrl(getAttribute(openTag, ["href"]));
      const isWatch = /dlbtn-watch/.test(openTag);

      if (!href) continue;

      if (isWatch) {
        watch = href;
        continue;
      }

      // Download link, may carry HEVC metadata
      const dataHevc = getAttribute(openTag, ["data-hevc"]);
      if (dataHevc === "1") {
        hevc = {
          quality: getAttribute(openTag, ["data-hq"]) || quality,
          size: getAttribute(openTag, ["data-hs"]) || size,
          url: href,
          altQuality: getAttribute(openTag, ["data-aq"]),
          altSize: getAttribute(openTag, ["data-as"]),
          altUrl: absoluteUrl(getAttribute(openTag, ["data-alt"])),
        };
      } else {
        download = { url: href, quality, size };
      }
    }

    // Only keep blocks that actually had at least one link
    if (!download && !hevc && !watch) continue;

    groups.push({
      label,
      quality,
      size,
      download,
      watch,
      hevc,
    });
  }

  return groups;
}

/* =========================================================
   CLEAN UP LABEL → SHORT TITLE
   ========================================================= */

function shortQuality(q) {
  if (!q) return "";
  return q
    .replace(/WEB[- ]?DL/i, "WEB-DL")
    .replace(/WEBRip/i, "WEBRip")
    .replace(/BluRay/i, "BluRay")
    .replace(/^4K-?2160p$/i, "4K 2160p")
    .trim();
}

/* =========================================================
   PUBLIC API
   ========================================================= */

async function fetchPage(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`CineFreak request failed: HTTP ${res.status} (${url})`);
  }
  return res.text();
}

/**
 * Fetch and parse a cinefreak.net movie/series detail page.
 * @param {string} url  full URL of the detail page
 * @returns {Promise<object>} normalized movie info
 */
async function getMovie(url) {
  if (!url) throw new Error("getMovie: missing URL");
  const absolute = absoluteUrl(url);
  const html = await fetchPage(absolute);

  const ld = extractJsonLd(html);
  const meta = parseMeta(html);

  const rawTitle =
    (ld && ld.headline) ||
    metaContent(html, "og:title") ||
    getText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");

  const title = cleanTitle(rawTitle);

  const trailer = extractTrailer(html);
  const downloads = extractDownloads(html);

  return {
    url: absolute,
    title,
    rawTitle,

    poster: extractPoster(html),
    backdrop: extractBackdrop(html),
    screenshots: extractScreenshots(html),

    synopsis: extractSynopsis(html),

    imdb: meta.imdb,
    imdbUrl: meta.imdbUrl,
    releaseDate: meta.releaseDate,
    runtime: meta.runtime,
    country: meta.country,
    language: meta.language,
    subtitle: meta.subtitle,
    qualityList: meta.qualityList,
    videoFormat: meta.videoFormat,
    genres: meta.genres,
    network: meta.network,

    trailer,

    downloads,

    source: "cinefreak",
  };
}

export default {
  getMovie,
};
