
const API_URL = "https://search.yagaverse.net/api/search";

async function search(query, page = 1) {
  const q = String(query || "").trim();

  if (!q) {
    return {
      results: [],
      total: 0,
      page: 1,
      hasMore: false
    };
  }

  const url = new URL(API_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("page", String(Math.max(1, page)));
  url.searchParams.set("per_page", "30");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Yagaverse API error: ${response.status}`
    );
  }

  const data = await response.json();

  const results = (data.hits || []).map((hit) => {
    const movie = hit.document || {};

    return {
      id: String(movie.id || ""),
      title: movie.title || "Unknown title",
      slug: movie.slug || "",
      poster: movie.thumb || "",
      thumbnail: movie.thumb || "",
      categories: Array.isArray(movie.cats)
        ? movie.cats
        : [],
      quality: movie.quality || "",
      date: movie.date || null,
      source: "yagaverse"
    };
  });

  return {
    results,
    total: data.found || 0,
    page: data.page || page,
    hasMore:
      (data.page || page) * 30 < (data.found || 0)
  };
}

export default {
  search
};
