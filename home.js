
const BASE_URL = "https://cinefreak.net";

const HOME_URL = `${BASE_URL}/`;
const DUAL_AUDIO_URL = `${BASE_URL}/dual-audio/`;

function getAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i")
  );

  return match ? decodeEntities(match[1]) : "";
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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

function absoluteUrl(url = "") {
  if (!url) return "";

  try {
    const result = new URL(url, BASE_URL);

    if (!["https:", "http:"].includes(result.protocol)) {
      return "";
    }

    return result.href;
  } catch {
    return "";
  }
}

function extractCards(html) {
  const cards = [];
  const cardRegex =
    /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bmovie-card\b)[^>]*>[\s\S]*?<\/a>/gi;

  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[0];
    const openingTag = cardHtml.match(/^<a\b[^>]*>/i)?.[0] || "";
    const imageTag = cardHtml.match(/<img\b[^>]*>/i)?.[0] || "";
    const titleMatch = cardHtml.match(
      /<h3\b[^>]*class=["'][^"']*movie-card-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i
    );

    const title = getText(titleMatch?.[1] || "");

    if (!title) continue;

    const formatMatch = cardHtml.match(
      /<div\b[^>]*class=["'][^"']*movie-card-formats[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );

    const formats = [];
    const formatRegex =
      /<span\b[^>]*>([\s\S]*?)<\/span>/gi;

    let format;

    while (
      (format = formatRegex.exec(formatMatch?.[1] || "")) !== null
    ) {
      const text = getText(format[1]);
      if (text) formats.push(text);
    }

    const qualityMatch = cardHtml.match(
      /<div\b[^>]*class=["'][^"']*quality-badges[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );

    const dateMatch = cardHtml.match(
      /<span\b[^>]*class=["'][^"']*time-ago[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
    );

    cards.push({
      id: absoluteUrl(getAttribute(openingTag, "href")),
      title,
      url: absoluteUrl(getAttribute(openingTag, "href")),
      poster: absoluteUrl(getAttribute(imageTag, "src")),
      thumbnail: absoluteUrl(getAttribute(imageTag, "src")),
      quality: getText(qualityMatch?.[1] || ""),
      categories: formats,
      date: getText(dateMatch?.[1] || ""),
      source: "cinefreak"
    });
  }

  // Remove duplicate cards by URL.
  return cards.filter(
    (item, index, list) =>
      item.url && list.findIndex((other) => other.url === item.url) === index
  );
}

function extractFeatured(html) {
  const featured = [];
  const slideRegex =
    /<div\b[^>]*class=["'][^"']*\bcine-slide\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

  // The homepage slider may contain nested divs, so also use a
  // direct title/image scan for featured entries.
  const titleRegex =
    /<h2\b[^>]*class=["'][^"']*cine-slide-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/gi;

  let titleMatch;

  while ((titleMatch = titleRegex.exec(html)) !== null) {
    const titleHtml = titleMatch[1];
    const linkTag = titleHtml.match(/<a\b[^>]*>/i)?.[0] || "";
    const title = getText(titleHtml);
    const url = absoluteUrl(getAttribute(linkTag, "href"));

    if (!title || !url) continue;

    // Find the nearest preceding slider image.
    const before = html.slice(0, titleMatch.index);
    const imageMatches = [
      ...before.matchAll(
        /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
      )
    ];

    const poster = absoluteUrl(
      imageMatches.length
        ? imageMatches[imageMatches.length - 1][1]
        : ""
    );

    if (!featured.some((item) => item.url === url)) {
      featured.push({
        id: url,
        title,
        url,
        poster,
        thumbnail: poster,
        source: "cinefreak"
      });
    }
  }

  return featured;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(
      `CineFreak request failed (${response.status}): ${url}`
    );
  }

  return response.text();
}

async function getHome() {
  const html = await fetchPage(HOME_URL);

  const latestReleases = extractCards(html);
  const featured = extractFeatured(html);

  let dualAudio = [];

  try {
    const categoryHtml = await fetchPage(DUAL_AUDIO_URL);
    dualAudio = extractCards(categoryHtml);
  } catch (error) {
    console.warn("Could not load Dual Audio:", error.message);
  }

  return {
    source: "cinefreak",
    name: "CineFreak",
    featured,
    sections: [
      {
        id: "latest-releases",
        title: "Latest Releases",
        url: HOME_URL,
        items: latestReleases
      },
      {
        id: "dual-audio",
        title: "Dual Audio",
        url: DUAL_AUDIO_URL,
        items: dualAudio
      }
    ],
    categories: [
      {
        id: "dual-audio",
        name: "Dual Audio",
        url: DUAL_AUDIO_URL
      }
    ]
  };
}

export default {
  getHome
};
