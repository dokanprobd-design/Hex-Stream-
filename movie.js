import { sdk } from "./sdk.js";

const HOME_URL = "https://cinefreak.net/";
const SOURCE = "cinefreak";

/* =========================================================
   TITLE CLEANING
   ========================================================= */

function cleanTitle(rawTitle) {
  if (!rawTitle) return "";
  let t = sdk.decodeEntities(rawTitle);
  const m = t.match(
    /^(.+?\(\d{4}\).*?)(?:\s+(?:Dual|Hindi|English|WEB|WEBRip|BluRay|HDTC|HDRip|HDCAM|PreDVD|HDTS|\d{3,4}p|HEVC|Full|Download|Watch|S\d+|Season)\b)/i
  );
  if (m) t = m[1];
  return t.split("|")[0].trim();
}

/* =========================================================
   POSTER / BACKDROP
   ========================================================= */

function extractPoster(html) {
  const og = sdk.meta(html, "og:image");
  if (og && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(og)) {
    return sdk.absolute(og, HOME_URL);
  }

  const posterMatch = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*\bposter-image\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*>/i
  );
  if (posterMatch) {
    const img = posterMatch[0].match(/<img\b[^>]*>/i);
    if (img) {
      return sdk.absolute(
        sdk.attr(img[0], ["data-src", "src", "data-lazy-src"]),
        HOME_URL
      );
    }
  }

  const imgAll = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgAll) {
    const src = sdk.attr(tag, ["src", "data-src"]);
    if (/tmdb|poster|cineimg/i.test(src) && !/logo|icon|avatar/i.test(src)) {
      return sdk.absolute(src, HOME_URL);
    }
  }
  return "";
}

function extractBackdrop(html) {
  const bgMatch = html.match(
    /id=["']cfClickPlay["'][^>]+style\s*=\s*["'][^"']*background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/i
  );
  if (bgMatch) return sdk.absolute(bgMatch[1], HOME_URL);

  const trailerBg = html.match(
    /class=["']cft-start["'][^>]+style\s*=\s*["'][^"']*url\(['"]?([^'")]+)['"]?\)/i
  );
  if (trailerBg) return sdk.absolute(trailerBg[1], HOME_URL);

  return extractPoster(html);
}

/* =========================================================
   METADATA
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
    return m ? sdk.text(m[1]) : "";
  };

  const imdbMatch = block.match(
    /<a[^>]+href\s*=\s*["'](https?:\/\/(?:www\.)?imdb\.com\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
  );
  if (imdbMatch) {
    out.imdbUrl = sdk.decodeEntities(imdbMatch[1]);
    out.imdb = sdk
      .text(imdbMatch[2])
      .replace(/^⭐\s*IMDb Rating:?\s*/i, "")
      .trim();
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

  const ld = sdk.jsonLd(html).find((n) => n["@type"] === "Article");
  if (ld && ld.articleSection) {
    out.genres = String(ld.articleSection)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!out.genres.length) {
    const genreMatches = [
      ...html.matchAll(
        /<span[^>]*class\s*=\s*["'][^"']*badge-outline[^"']*["'][^>]*>[\s\S]*?<a[^>]+href\s*=\s*["'][^"']*\/genre\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi
      ),
    ];
    out.genres = genreMatches.map((m) => sdk.text(m[1])).filter(Boolean);
  }

  const ottMatch = html.match(
    /<span[^>]*class\s*=\s*["'][^"']*badge-outline[^"']*["'][^>]*>[\s\S]*?<a[^>]+href\s*=\s*["'][^"']*\/ott\/([^"'\/]+)\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
  );
  if (ottMatch) out.network = sdk.text(ottMatch[2]);

  return out;
}

/* =========================================================
   SYNOPSIS / TRAILER / SCREENSHOTS
   ========================================================= */

function extractSynopsis(html) {
  const synMatch = html.match(
    /Plot Summary\s*\/?\s*Storyline\s*:?[\s\S]*?<\/h[1-6]>([\s\S]*?)(?:<h[1-6]|<\/div>)/i
  );
  if (synMatch) {
    const text = sdk.stripTags(synMatch[1]).trim();
    if (text) return text;
  }
  return sdk.meta(html, "og:description") || "";
}

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

function extractScreenshots(html) {
  const shots = [];
  const seen = new Set();

  const block = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*screenshot-container[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<center>/i
  );
  const scope = block ? block[1] : html;

  for (const m of scope.matchAll(/<img\b[^>]*>/gi)) {
    const src = sdk.absolute(
      sdk.attr(m[0], ["data-src", "src", "data-lazy-src"]),
      HOME_URL
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

  const blockRegex =
    /<h4[^>]*class\s*=\s*["'][^"']*\bmovie-title\b[^"']*["'][^>]*>([\s\S]*?)<\/h4>\s*<div[^>]*class\s*=\s*["'][^"']*\bdlbtn-container\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;

  for (const m of html.matchAll(blockRegex)) {
    const label = sdk.text(m[1]);
    const container = m[2];

    const qMatch = label.match(/\b(\d{3,4}p|4K-?2160p|4K)\b/i);
    const sizeMatch = label.match(/\[([\d.]+\s*(?:MB|GB|KB))\]/i);
    const quality = qMatch ? qMatch[1] : "";
    const size = sizeMatch ? sizeMatch[1] : "";

    let download = null;
    let watch = null;
    let hevc = null;

    for (const linkMatch of container.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
      const openTag = linkMatch[0].match(/<a\b[^>]*>/i)?.[0] || "";
      const href = sdk.absolute(sdk.attr(openTag, ["href"]), HOME_URL);
      const isWatch = /dlbtn-watch/.test(openTag);

      if (!href) continue;

      if (isWatch) {
        watch = href;
        continue;
      }

      const dataHevc = sdk.attr(openTag, ["data-hevc"]);
      if (dataHevc === "1") {
        hevc = {
          quality: sdk.attr(openTag, ["data-hq"]) || quality,
          size: sdk.attr(openTag, ["data-hs"]) || size,
          url: href,
          altQuality: sdk.attr(openTag, ["data-aq"]),
          altSize: sdk.attr(openTag, ["data-as"]),
          altUrl: sdk.absolute(sdk.attr(openTag, ["data-alt"]), HOME_URL),
        };
      } else {
        download = { url: href, quality, size };
      }
    }

    if (!download && !hevc && !watch) continue;

    groups.push({ label, quality, size, download, watch, hevc });
  }

  return groups;
}

/* =========================================================
   PUBLIC API
   ========================================================= */

async function getMovie(url) {
  if (!url) throw new Error("getMovie: missing URL");
  const absolute = sdk.absolute(url, HOME_URL);
  const html = await sdk.fetchHtml(absolute);

  const ld = sdk.jsonLd(html).find((n) => n["@type"] === "Article");
  const meta = parseMeta(html);

  const rawTitle =
    (ld && ld.headline) ||
    sdk.meta(html, "og:title") ||
    sdk.text(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");

  const title = cleanTitle(rawTitle);

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

    trailer: extractTrailer(html),

    downloads: extractDownloads(html),

    source: SOURCE,
  };
}

export default {
  getMovie,
};
