const HOME_URL = "https://cinefreak.net/";
const DUAL_AUDIO_URL = "https://cinefreak.net/dual-audio/";

function decodeEntities(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function absoluteUrl(url = "") {
  const value = decodeEntities(url.trim());

  if (!value || value.startsWith("data:")) {
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

    if (value) {
      return decodeEntities(value);
    }
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
      "src"
    ])
  );
}

function getFirstLink(html) {
  const match = html.match(/<a\b[^>]*>/i);

  return absoluteUrl(
    getAttribute(match?.[0] || "", ["href"])
  );
}

function getCardTitle(card) {
  const titleMatch = card.match(
    /<[^>]*class=["'][^"']*movie-card-title[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
  );

  if (titleMatch?.[1]) {
    return getText(titleMatch[1]);
  }

  const imageTag = card.match(/<img\b[^>]*>/i)?.[0] || "";

  return (
    getAttribute(imageTag, ["alt", "title"]) ||
    ""
  );
}

function extractCards(html, source = "cinefreak") {
  const cards = [];

  // Locate movie-card elements and read their contents.
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

    if (!url || !title) {
      continue;
    }

    cards.push({
      id: url,
      title,
      slug: url.replace(/\/+$/, "").split("/").pop() || "",
      url,
      poster,
      thumbnail: poster,
      quality: getText(qualityMatch?.[1] || ""),
      source
    });
  }

  // Avoid duplicate cards if the page repeats a movie.
  return cards.filter(
    (movie, index, all) =>
      all.findIndex(item => item.url === movie.url) === index
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
      getAttribute(
        slide.match(/<img\b[^>]*>/i)?.[0] || "",
        ["alt", "title"]
      );

    if (!url || !title) {
      continue;
    }

    featured.push({
      id: url,
      title,
      url,
      poster,
      thumbnail: poster,
      source: "cinefreak"
    });
  }

  return featured;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html"
    }
  });

  if (!response.ok) {
    throw new Error(
      `CineFreak request failed: HTTP ${response.status} (${url})`
    );
  }

  return response.text();
}

async function getHome() {
  const [homeHtml, dualAudioHtml] = await Promise.all([
    fetchPage(HOME_URL),
    fetchPage(DUAL_AUDIO_URL)
  ]);

  const latestReleases = extractCards(
    homeHtml,
    "cinefreak"
  );

  const dualAudio = extractCards(
    dualAudioHtml,
    "cinefreak"
  );

  return {
    source: "cinefreak",
    name: "CineFreak",

    featured: extractFeatured(homeHtml),

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
