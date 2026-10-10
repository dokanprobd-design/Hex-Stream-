/* =========================================================
   hexplugins SDK v1
   Shared HTML/HTTP helpers for provider plugins.
   ========================================================= */

export const sdk = {
  /* ---------- Strings ---------- */

  decodeEntities(text = "") {
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
  },

  stripTags(html = "") {
    return String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  },

  text(html = "") {
    return sdk.decodeEntities(sdk.stripTags(html).replace(/\s+/g, " "));
  },

  /* ---------- URLs ---------- */

  absolute(url, base) {
    if (!url) return "";
    const v = sdk.decodeEntities(String(url).trim());
    if (!v || v.startsWith("data:") || v.startsWith("javascript:")) return "";
    try {
      return new URL(v, base).href;
    } catch {
      return "";
    }
  },

  /* ---------- Attribute / tag helpers ---------- */

  attr(tag = "", names = []) {
    for (const name of names) {
      const re = new RegExp(
        `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
        "i"
      );
      const m = tag.match(re);
      const v = m?.[1] ?? m?.[2] ?? m?.[3];
      if (v) return sdk.decodeEntities(v);
    }
    return "";
  },

  /**
   * Find every element whose class list contains `className`.
   * Returns [{ tag, openTag, outer }].
   */
  findByClass(html, className) {
    const out = [];
    const opener = new RegExp(
      `<([a-zA-Z][\\w-]*)\\b(?=[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${className}\\b)[^>]*>`,
      "gi"
    );

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
      out.push({
        tag: tagName,
        openTag: match[0],
        outer: html.slice(startIdx, closeEnd),
      });
    }
    return out;
  },

  /* ---------- Meta tags ---------- */

  meta(html, prop) {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]+content\\s*=\\s*["']([^"']*)["']`,
      "i"
    );
    const re2 = new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]+(?:property|name)\\s*=\\s*["']${prop}["']`,
      "i"
    );
    const m = html.match(re1) || html.match(re2);
    return m ? sdk.decodeEntities(m[1]) : "";
  },

  jsonLd(html) {
    const out = [];
    const blocks = [
      ...html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      ),
    ];
    for (const b of blocks) {
      try {
        const data = JSON.parse(sdk.decodeEntities(b[1]));
        if (data["@graph"]) out.push(...data["@graph"]);
        else out.push(data);
      } catch {
        /* ignore malformed JSON-LD */
      }
    }
    return out;
  },

  /* ---------- HTTP ---------- */

  async fetchHtml(url, headers = {}) {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/html", ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  },

  async fetchJson(url, headers = {}) {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  },

  /* ---------- Response builder ---------- */

  packSearch(items, page, hasMore) {
    const seen = new Set();
    const results = [];
    for (const it of items) {
      const key = it.url || it.id || it.title;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(it);
    }
    return {
      results,
      total: results.length,
      page,
      hasMore: !!hasMore,
    };
  },
};

export default sdk;
