const ProviderConfig = {
    id: "cinevood",
    name: "CineVood",
    version: "1.0.0",

    requiresBrowserSession: true,

    website: "https://cinevood.net/"
};


/* ============================================================
 * HOME
 * ============================================================
 */

async function Home() {

    const html = await HexHttp.get(
        ProviderConfig.website
    );

    if (!html) {
        throw new Error("Home page returned empty HTML");
    }

    const movies = parseLatestMovies(html);

    return {
        success: true,

        title: "Home",

        categories: [
            {
                id: "latest",
                title: "Latest Movies",
                type: "movie",

                items: movies
            }
        ]
    };
}


/* ============================================================
 * PARSE LATEST MOVIES
 * ============================================================
 *
 * HTML structure from provider:
 *
 * article.latestPost
 *   ├── a.post-image
 *   │      └── .featured-thumbnail img
 *   │
 *   └── h2.front-view-title
 *          └── a
 *
 */

function parseLatestMovies(html) {

    const parser = new DOMParser();

    const document = parser.parseFromString(
        html,
        "text/html"
    );

    const articles =
        document.querySelectorAll(
            "article.latestPost"
        );

    const items = [];

    for (const article of articles) {

        try {

            /*
             * Movie URL
             */
            const link =
                article.querySelector(
                    "a.post-image"
                );

            /*
             * Poster
             */
            const image =
                article.querySelector(
                    ".featured-thumbnail img"
                );

            /*
             * Title
             */
            const titleElement =
                article.querySelector(
                    "h2.front-view-title a"
                );


            if (!link || !titleElement) {
                continue;
            }


            let url =
                link.getAttribute("href");

            let title =
                titleElement.textContent
                    .trim();


            let poster = null;


            if (image) {

                poster =
                    image.getAttribute("src");

                /*
                 * Some sites may use lazy loading.
                 */
                if (!poster) {
                    poster =
                        image.getAttribute(
                            "data-src"
                        );
                }

                if (!poster) {
                    poster =
                        image.getAttribute(
                            "data-lazy-src"
                        );
                }
            }


            /*
             * Validate
             */

            if (!url || !title) {
                continue;
            }


            /*
             * Convert relative URL
             * into absolute URL.
             */

            url =
                absoluteUrl(
                    url,
                    ProviderConfig.website
                );


            if (poster) {

                poster =
                    absoluteUrl(
                        poster,
                        ProviderConfig.website
                    );
            }


            /*
             * Create stable ID.
             */

            const id =
                createId(url);


            /*
             * Native Android movie model
             */

            items.push({

                id: id,

                title: title,

                url: url,

                poster: poster,

                type: "movie"

            });

        } catch (error) {

            /*
             * One broken article should
             * not stop the entire homepage.
             */

            continue;
        }
    }


    return items;
}


/* ============================================================
 * ABSOLUTE URL
 * ============================================================
 */

function absoluteUrl(url, baseUrl) {

    if (!url) {
        return null;
    }

    url = url.trim();

    /*
     * Already absolute
     */
    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {
        return url;
    }


    /*
     * Protocol-relative URL
     *
     * //example.com/image.jpg
     */

    if (url.startsWith("//")) {

        return "https:" + url;
    }


    /*
     * Root-relative URL
     *
     * /wp-content/image.jpg
     */

    if (url.startsWith("/")) {

        const match =
            baseUrl.match(
                /^(https?:\/\/[^/]+)/
            );

        if (match) {

            return (
                match[1] + url
            );
        }
    }


    /*
     * Relative URL
     */

    return (
        baseUrl.replace(/\/+$/, "") +
        "/" +
        url.replace(/^\/+/, "")
    );
}


/* ============================================================
 * CREATE ID
 * ============================================================
 */

function createId(url) {

    return url
        .replace(
            /^https?:\/\//i,
            ""
        )
        .replace(
            /[^a-zA-Z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        )
        .toLowerCase();
}


/* ============================================================
 * PROVIDER EXPORT
 * ============================================================
 *
 * ProviderManager in Java can call:
 *
 * HexProvider.Home()
 *
 */

globalThis.HexProvider = {

    id: ProviderConfig.id,

    name: ProviderConfig.name,

    version: ProviderConfig.version,

    Home: Home

};





One important point for the **first APK test**: this assumes your JavaScript engine provides `DOMParser`. If your APK reports `DOMParser is not defined`, don't change the provider architecture yet—we'll replace only the HTML parsing part with the parser available in your Android JS runtime.
