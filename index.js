
const API_URL = "https://search.yagaverse.net/api/search";
const PAGE_SIZE = 30;

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

  const currentPage = Math.max(1, Number(page) || 1);

  const url = new URL(API_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("page", String(currentPage));
  url.searchParams.set("per_page", String(PAGE_SIZE));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Yagaverse search failed: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  const results = (data.hits || []).map(({ document = {} }) => ({
    id: String(document.id || ""),
    title: document.title || "Unknown title",
    slug: document.slug || "",
    poster: document.thumb || "",
    thumbnail: document.thumb || "",
    categories: Array.isArray(document.cats)
      ? document.cats
      : [],
    quality: document.quality || "",
    date: document.date || null,
    source: "yagaverse"
  }));

  return {
    results,
    total: Number(data.found || 0),
    page: Number(data.page || currentPage),
    hasMore:
      Number(data.page || currentPage) * PAGE_SIZE <
      Number(data.found || 0)
  };
}

export default {
  search
};
