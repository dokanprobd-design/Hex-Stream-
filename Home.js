const ProviderConfig = {
    requiresBrowserSession: true,

    website: "https://cinevood.net/"
};


async function Home() {

    const html = await HexHttp.get(
        ProviderConfig.website
    );

    return {
        title: "Home",
        items: parseHome(html)
    };
}


/**
 * Parse home page HTML.
 */
function parseHome(html) {

    const parser = new DOMParser();

    const document = parser.parseFromString(
        html,
        "text/html"
    );

    const articles = document.querySelectorAll(
        "article.latestPost"
    );

    const items = [];

    for (const article of articles) {

        const link = article.querySelector(
            "a.post-image"
        );

        const image = article.querySelector(
            ".featured-thumbnail img"
        );

        const titleElement = article.querySelector(
            "h2.front-view-title a"
        );

        if (!link || !titleElement) {
            continue;
        }

        const url = link.getAttribute("href");

        const title =
            titleElement.textContent.trim();

        const poster =
            image
                ? image.getAttribute("src")
                : null;

        if (!url || !title) {
            continue;
        }

        items.push({
            id: createId(url),

            title: title,

            url: url,

            poster: poster,

            type: "movie"
        });
    }

    return items;
}


/**
 * Create a stable ID from the movie URL.
 */
function createId(url) {

    return url
        .replace(/^https?:\/\//i, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}


/**
 * Plugin entry point.
 */
globalThis.HexProvider = {

    id: "cinevood",

    name: "CineVood",

    version: "1.0.0",

    Home: Home

};
