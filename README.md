# HexPlayer Plugin SDK

Create powerful JavaScript plugins for **HexPlayer**.

HexPlayer plugins allow developers to add their own content providers without modifying the HexPlayer Android application.

A plugin can define:

- Home categories
- Latest content
- Trending content
- Genre categories
- Search
- Movie information
- TV show information
- Episodes
- Authorized streaming sources
- Subtitles
- Custom provider logic

The Android application provides the UI and player.  
The JavaScript plugin provides the content and provider logic.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Plugin Structure](#plugin-structure)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [manifest.json](#manifestjson)
- [Home.js](#homejs)
- [Search.js](#searchjs)
- [MovieInfo.js](#movieinfojs)
- [ExtractLink.js](#extractlinkjs)
- [Movie Object](#movie-object)
- [Category Object](#category-object)
- [Source Object](#source-object)
- [HTTP API](#http-api)
- [Complete Example](#complete-example)
- [Building a Plugin](#building-a-plugin)
- [BIN Files](#bin-files)
- [Plugin Installation](#plugin-installation)
- [Plugin API Version](#plugin-api-version)
- [Error Handling](#error-handling)
- [Security](#security)
- [Developer Rules](#developer-rules)
- [Testing](#testing)
- [Publishing](#publishing)
- [FAQ](#faq)

---

# Overview

A HexPlayer plugin is a JavaScript program loaded by the HexPlayer Android application.

The plugin developer controls the provider logic.

The HexPlayer application controls:

- Android UI
- RecyclerViews
- Movie cards
- Search UI
- Details UI
- Media3 player
- Playback controls
- Watch history
- Favorites
- Downloads
- Plugin management

The plugin controls:

- What content is displayed
- Home categories
- Search results
- Movie information
- Episodes
- Authorized media sources

This separation allows developers to create providers without changing the Android application.

---

# Architecture

```text
                 HexPlayer Android
                       │
                       │
                 Plugin Manager
                       │
                       ▼
                JavaScript Runtime
                       │
                       ▼
                 HexPlayer Plugin
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Home.js       Search.js     MovieInfo.js
        │                             │
        │                             │
        └──────────────┬──────────────┘
                       │
                 ExtractLink.js
                       │
                       ▼
                 Source Objects
                       │
                       ▼
                  Media3 Player
```

The Android application should not need to know what categories a plugin provides.

For example, one plugin can provide:

```text
Latest Movies
Trending
Hindi Movies
English Movies
Tamil Movies
```

Another plugin can provide:

```text
Latest
Popular
Korean
Japanese
Drama
Action
```

The Android application dynamically displays whatever categories the plugin returns.

---

# Plugin Structure

A basic plugin should look like this:

```text
MyPlugin/
│
├── manifest.json
│
├── Home.js
├── Search.js
├── MovieInfo.js
└── ExtractLink.js
```

For a larger plugin:

```text
MyPlugin/
│
├── manifest.json
│
├── Home.js
├── Search.js
├── MovieInfo.js
├── Episodes.js
├── ExtractLink.js
├── Subtitles.js
│
└── assets/
    └── icon.png
```

The minimum recommended files are:

```text
manifest.json
Home.js
Search.js
MovieInfo.js
ExtractLink.js
```

---

# Creating Your First Plugin

Create a new folder:

```bash
mkdir MyPlugin
cd MyPlugin
```

Create:

```text
manifest.json
Home.js
Search.js
MovieInfo.js
ExtractLink.js
```

Your final project:

```text
MyPlugin/
├── manifest.json
├── Home.js
├── Search.js
├── MovieInfo.js
└── ExtractLink.js
```

---

# manifest.json

Every plugin must contain a `manifest.json`.

Example:

```json
{
  "id": "my-provider",
  "name": "My Provider",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "My HexPlayer provider",
  "apiVersion": 1
}
```

## Manifest fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique plugin ID |
| `name` | Yes | Plugin display name |
| `version` | Yes | Plugin version |
| `author` | Yes | Plugin author |
| `description` | Yes | Plugin description |
| `apiVersion` | Yes | Plugin API version |

### Plugin ID

The plugin ID must be unique.

Good:

```text
my-provider
cine-provider
example-provider
```

Avoid:

```text
My Provider
my provider
provider 1
```

Use lowercase letters, numbers, and hyphens.

---

# Home.js

`Home.js` controls the provider's home content.

The Android application does not hard-code provider categories.

The plugin defines them.

Example:

```javascript
async function Home() {

    return {

        title: "My Provider",

        categories: [

            {
                id: "latest",
                title: "Latest Movies",
                items: await getLatest()
            },

            {
                id: "trending",
                title: "Trending",
                items: await getTrending()
            },

            {
                id: "hindi",
                title: "Hindi Movies",
                items: await getHindi()
            }

        ]

    };
}
```

The Android application receives:

```json
{
  "title": "My Provider",
  "categories": [
    {
      "id": "latest",
      "title": "Latest Movies",
      "items": []
    },
    {
      "id": "trending",
      "title": "Trending",
      "items": []
    },
    {
      "id": "hindi",
      "title": "Hindi Movies",
      "items": []
    }
  ]
}
```

The app automatically creates the corresponding sections.

---

# Creating Categories

You can add as many categories as your provider needs.

Example:

```javascript
async function Home() {

    return {

        title: "My Provider",

        categories: [

            {
                id: "latest",
                title: "Latest Movies",
                items: await getLatest()
            },

            {
                id: "trending",
                title: "Trending",
                items: await getTrending()
            },

            {
                id: "hindi",
                title: "Hindi Movies",
                items: await getHindi()
            },

            {
                id: "tamil",
                title: "Tamil Movies",
                items: await getTamil()
            },

            {
                id: "english",
                title: "English Movies",
                items: await getEnglish()
            },

            {
                id: "korean",
                title: "Korean Movies",
                items: await getKorean()
            }

        ]

    };
}
```

There is no fixed list of categories.

The plugin developer decides what categories are available.

---

# Category Object

A category uses:

```javascript
{
    id: "latest",
    title: "Latest Movies",
    items: []
}
```

## Fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique category ID |
| `title` | Yes | Category title shown in UI |
| `items` | Yes | Array of content items |

Example:

```javascript
{
    id: "anime",
    title: "Anime",
    items: await getAnime()
}
```

---

# Home Content Functions

You can create helper functions inside `Home.js`.

Example:

```javascript
async function getLatest() {

    const data = await HexHttp.getJson(
        "https://example.com/latest"
    );

    return data.results;
}
```

Another category:

```javascript
async function getTrending() {

    const data = await HexHttp.getJson(
        "https://example.com/trending"
    );

    return data.results;
}
```

Another:

```javascript
async function getHindi() {

    const data = await HexHttp.getJson(
        "https://example.com/hindi"
    );

    return data.results;
}
```

---

# Search.js

`Search.js` handles search requests.

The Android application calls:

```text
Search(query)
```

Example:

```javascript
async function Search(query) {

    const url =
        "https://example.com/search?q=" +
        encodeURIComponent(query);

    const data = await HexHttp.getJson(url);

    return data.results;
}
```

The returned value should be an array of movie objects.

---

# Search Flow

```text
User
 │
 │ enters "RRR"
 ▼
Android SearchActivity
 │
 ▼
Search("RRR")
 │
 ▼
Search.js
 │
 ▼
Provider API
 │
 ▼
Movie[]
 │
 ▼
Android MovieAdapter
 │
 ▼
Movie Grid
```

---

# MovieInfo.js

When the user selects a movie, the Android application calls:

```text
MovieInfo(movie)
```

Example:

```javascript
async function MovieInfo(movie) {

    const data = await HexHttp.getJson(movie.url);

    return {

        id: data.id,

        title: data.title,

        poster: data.poster,

        backdrop: data.backdrop,

        description: data.description,

        year: data.year,

        rating: data.rating,

        genres: data.genres,

        type: data.type

    };
}
```

---

# Movie Information

A movie information object can contain:

```javascript
{
    id: "123",
    title: "Example Movie",
    poster: "https://example.com/poster.jpg",
    backdrop: "https://example.com/backdrop.jpg",
    description: "Example description",
    year: 2026,
    rating: 8.5,
    genres: [
        "Action",
        "Drama"
    ],
    type: "movie"
}
```

---

# Movie Object

The standard movie object is:

```javascript
{
    id: "123",
    title: "Example Movie",
    url: "https://example.com/movie/123",
    poster: "https://example.com/poster.jpg",
    backdrop: "https://example.com/backdrop.jpg",
    year: 2026,
    type: "movie"
}
```

## Fields

| Field | Required | Description |
|---|---|---|
| `id` | Recommended | Provider content ID |
| `title` | Yes | Movie/show title |
| `url` | Yes | Provider page URL |
| `poster` | Recommended | Poster image |
| `backdrop` | Optional | Backdrop image |
| `year` | Optional | Release year |
| `type` | Yes | `movie` or `tv` |

---

# TV Shows

A TV show can use:

```javascript
{
    id: "tv123",
    title: "Example Series",
    url: "https://example.com/series/123",
    poster: "https://example.com/poster.jpg",
    year: 2026,
    type: "tv"
}
```

The Android application can then call the appropriate episode API.

---

# Episodes.js

TV providers can optionally provide:

```text
Episodes.js
```

Example:

```javascript
async function Episodes(show) {

    const data = await HexHttp.getJson(show.url);

    return data.episodes.map(item => ({

        id: item.id,

        season: item.season,

        number: item.number,

        title: item.title,

        url: item.url

    }));
}
```

Example result:

```json
[
  {
    "id": "s1e1",
    "season": 1,
    "number": 1,
    "title": "Episode 1",
    "url": "https://example.com/e1"
  },
  {
    "id": "s1e2",
    "season": 1,
    "number": 2,
    "title": "Episode 2",
    "url": "https://example.com/e2"
  }
]
```

---

# ExtractLink.js

`ExtractLink.js` is responsible for returning authorized playable sources.

Example:

```javascript
async function ExtractLink(movie) {

    const data = await HexHttp.getJson(
        movie.url
    );

    return data.sources;
}
```

A source object:

```javascript
{
    url: "https://example.com/video/master.m3u8",
    type: "hls",
    quality: "1080p"
}
```

---

# Multiple Sources

A plugin can return multiple authorized sources:

```javascript
async function ExtractLink(movie) {

    return [

        {
            url: "https://example.com/1080.m3u8",
            type: "hls",
            quality: "1080p"
        },

        {
            url: "https://example.com/720.m3u8",
            type: "hls",
            quality: "720p"
        },

        {
            url: "https://example.com/video.mp4",
            type: "mp4",
            quality: "480p"
        }

    ];
}
```

The Android player can then select the appropriate source.

Plugins must only provide sources that the developer is authorized to access and distribute.

---

# Source Object

Standard source:

```javascript
{
    url: "https://example.com/video.m3u8",
    type: "hls",
    quality: "1080p"
}
```

Supported types depend on the HexPlayer player implementation.

Common types:

```text
hls
dash
mp4
webm
```

---

# HTTP API

Plugins should use the HexPlayer HTTP API rather than directly depending on Android classes.

Example:

```javascript
const data = await HexHttp.getJson(url);
```

The final SDK can provide:

```javascript
HexHttp.get()
HexHttp.getJson()
HexHttp.post()
HexHttp.postJson()
```

Example:

```javascript
const response = await HexHttp.get(
    "https://example.com/api"
);
```

Example JSON request:

```javascript
const data = await HexHttp.getJson(
    "https://example.com/api"
);
```

---

# Headers

Where permitted by the provider/API, the plugin can use request headers through the SDK.

Example:

```javascript
const data = await HexHttp.getJson(
    url,
    {
        "User-Agent": "HexPlayer",
        "Accept": "application/json"
    }
);
```

The exact supported header API is determined by the HexPlayer SDK version.

---

# Complete Example Plugin

A complete plugin:

```text
ExampleProvider/
│
├── manifest.json
├── Home.js
├── Search.js
├── MovieInfo.js
├── Episodes.js
└── ExtractLink.js
```

---

## manifest.json

```json
{
  "id": "example-provider",
  "name": "Example Provider",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Example HexPlayer provider",
  "apiVersion": 1
}
```

---

## Home.js

```javascript
async function Home() {

    return {

        title: "Example Provider",

        categories: [

            {
                id: "latest",
                title: "Latest Movies",
                items: await getLatest()
            },

            {
                id: "trending",
                title: "Trending",
                items: await getTrending()
            },

            {
                id: "hindi",
                title: "Hindi Movies",
                items: await getHindi()
            }

        ]

    };
}


async function getLatest() {

    const data = await HexHttp.getJson(
        "https://example.com/latest"
    );

    return data.results;
}


async function getTrending() {

    const data = await HexHttp.getJson(
        "https://example.com/trending"
    );

    return data.results;
}


async function getHindi() {

    const data = await HexHttp.getJson(
        "https://example.com/hindi"
    );

    return data.results;
}
```

---

## Search.js

```javascript
async function Search(query) {

    const data = await HexHttp.getJson(
        "https://example.com/search?q=" +
        encodeURIComponent(query)
    );

    return data.results;
}
```

---

## MovieInfo.js

```javascript
async function MovieInfo(movie) {

    const data = await HexHttp.getJson(
        movie.url
    );

    return {

        id: data.id,

        title: data.title,

        poster: data.poster,

        backdrop: data.backdrop,

        description: data.description,

        year: data.year,

        rating: data.rating,

        genres: data.genres,

        type: data.type

    };
}
```

---

## Episodes.js

```javascript
async function Episodes(show) {

    const data = await HexHttp.getJson(
        show.url
    );

    return data.episodes;
}
```

---

## ExtractLink.js

```javascript
async function ExtractLink(movie) {

    const data = await HexHttp.getJson(
        movie.url
    );

    return data.sources;
}
```

---

# Plugin Runtime

The Android application loads the plugin.

Conceptually:

```text
MyPlugin.bin
      │
      ▼
PluginManager.java
      │
      ▼
JavaScript Runtime
      │
      ├── Home()
      ├── Search()
      ├── MovieInfo()
      ├── Episodes()
      └── ExtractLink()
```

The Java application does not need to know how these functions are implemented.

---

# Java Application Flow

## Home

```text
HomeActivity
     │
     ▼
PluginManager
     │
     ▼
Home()
     │
     ▼
Category[]
     │
     ├── Latest Movies
     ├── Trending
     └── Hindi Movies
     │
     ▼
RecyclerView
```

## Search

```text
SearchActivity
     │
     ▼
PluginManager
     │
     ▼
Search("RRR")
     │
     ▼
Movie[]
     │
     ▼
MovieAdapter
```

## Movie Details

```text
Movie Card
     │
     ▼
MovieInfo(movie)
     │
     ▼
Movie Details
```

## Playback

```text
Play
 │
 ▼
ExtractLink(movie)
 │
 ▼
Source[]
 │
 ▼
Media3 / ExoPlayer
```

---

# Java Plugin Manager

The Java application can expose a generic interface similar to:

```java
public class PluginManager {

    public Object home() {
        return jsEngine.call("Home");
    }

    public Object search(String query) {
        return jsEngine.call("Search", query);
    }

    public Object movieInfo(Object movie) {
        return jsEngine.call("MovieInfo", movie);
    }

    public Object episodes(Object show) {
        return jsEngine.call("Episodes", show);
    }

    public Object extractLink(Object item) {
        return jsEngine.call("ExtractLink", item);
    }
}
```

The actual JavaScript engine implementation is an internal HexPlayer detail.

---

# Dynamic Categories

This is one of the most important features of the HexPlayer plugin system.

The Android application should NOT contain:

```java
if (category.equals("Hindi")) {
    ...
}

if (category.equals("Trending")) {
    ...
}
```

Instead, the plugin returns:

```javascript
categories: [
    {
        id: "latest",
        title: "Latest Movies",
        items: [...]
    },

    {
        id: "hindi",
        title: "Hindi Movies",
        items: [...]
    },

    {
        id: "anime",
        title: "Anime",
        items: [...]
    }
]
```

The Android application simply loops through the categories.

This means a plugin developer can add:

```javascript
{
    id: "korean",
    title: "Korean Movies",
    items: await getKorean()
}
```

without requiring an Android application update.

---

# Optional APIs

Future versions of the SDK may support:

```text
Home()
Search()
MovieInfo()
Episodes()
ExtractLink()
Subtitles()
Recommendations()
Genres()
Latest()
Popular()
```

Only APIs supported by the declared `apiVersion` should be used.

---

# Error Handling

Plugins should handle network errors.

Bad:

```javascript
async function Search(query) {

    const data = await HexHttp.getJson(url);

    return data.results;
}
```

Better:

```javascript
async function Search(query) {

    try {

        const data = await HexHttp.getJson(url);

        return data.results || [];

    } catch (error) {

        console.error(
            "Search failed:",
            error.message
        );

        return [];
    }
}
```

A failed provider request should not crash the entire Android application.

---

# Logging

Plugins can use:

```javascript
console.log("Search started");
```

Warnings:

```javascript
console.warn("No results found");
```

Errors:

```javascript
console.error("Request failed");
```

HexPlayer can display these logs when developer/debug mode is enabled.

---

# Plugin Build System

Plugin developers write normal JavaScript.

They do not need to manually merge files.

Example:

```text
Home.js
Search.js
MovieInfo.js
ExtractLink.js
```

The build system performs:

```text
JavaScript
    │
    ▼
Validation
    │
    ▼
Merge
    │
    ▼
Minification
    │
    ▼
Obfuscation
    │
    ▼
Encryption
    │
    ▼
.bin
```

---

# Building a Plugin

The Plugin SDK will provide a build command.

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Output:

```text
dist/
└── MyPlugin.bin
```

The developer should distribute the generated `.bin` file rather than the development files when using the protected distribution format.

---

# BIN Format

The final plugin is distributed as:

```text
MyPlugin.bin
```

A `.bin` file is not intended to be edited manually.

The build system can package:

```text
manifest
plugin metadata
compiled JavaScript
integrity information
encrypted payload
```

The exact binary format is controlled by the HexPlayer Plugin SDK.

---

# Important Security Note

The `.bin` format is intended to make the distributed plugin harder to inspect and modify.

It should not be considered impossible to reverse engineer.

If code executes on a user's device, a sufficiently determined user may potentially inspect runtime behavior.

Therefore:

**Never put permanent private secrets inside a plugin.**

For example, avoid embedding:

```javascript
const PRIVATE_API_KEY = "super-secret-key";
```

Prefer server-side authentication or short-lived tokens where appropriate.

---

# Provider API Keys

Do not expose permanent private credentials.

Bad:

```javascript
const API_KEY = "PRIVATE_SECRET";
```

Better:

```text
Plugin
   │
   ▼
Your Server
   │
   ▼
Private API
```

The private credential remains on the server.

---

# Legal and Provider Requirements

Plugin developers are responsible for ensuring that their plugin complies with:

- Applicable law
- Provider terms of service
- Copyright requirements
- API terms
- Content licensing requirements
- Privacy requirements

Plugins should only provide content and streaming sources that the developer is authorized to access and distribute.

HexPlayer does not grant permission to access or redistribute third-party content.

---

# Plugin Permissions

Future plugin versions may support permissions.

Example:

```json
{
  "permissions": [
    "network"
  ]
}
```

Possible future permissions:

```text
network
storage
notifications
metadata
```

Plugins should request only the permissions they actually need.

---

# Plugin Versioning

Use semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Example:

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

### Patch

Bug fixes:

```text
1.0.0 → 1.0.1
```

### Minor

New functionality without breaking existing APIs:

```text
1.0.0 → 1.1.0
```

### Major

Breaking changes:

```text
1.0.0 → 2.0.0
```

---

# API Versioning

Plugins must specify:

```json
{
  "apiVersion": 1
}
```

If HexPlayer introduces breaking changes:

```text
Plugin API 1
Plugin API 2
Plugin API 3
```

The application can reject incompatible plugins rather than crashing.

---

# Recommended Development Workflow

```text
1. Create plugin
       ↓
2. Create manifest.json
       ↓
3. Create Home.js
       ↓
4. Create Search.js
       ↓
5. Create MovieInfo.js
       ↓
6. Create ExtractLink.js
       ↓
7. Add optional Episodes.js
       ↓
8. Test each function
       ↓
9. Run npm run build
       ↓
10. Generate .bin
       ↓
11. Install .bin in HexPlayer
       ↓
12. Test
       ↓
13. Publish
```

---

# Recommended GitHub Repository

A plugin repository can look like:

```text
MyPlugin/
│
├── README.md
├── manifest.json
│
├── Home.js
├── Search.js
├── MovieInfo.js
├── Episodes.js
└── ExtractLink.js
```

The repository README should explain:

```text
Plugin name
Author
Version
Supported content
Installation
Development
License
```

---

# Example README for a Plugin

```markdown
# My Provider

HexPlayer JavaScript provider.

## Author

Your Name

## Version

1.0.0

## Features

- Latest Movies
- Trending
- Hindi Movies
- Search
- Movie Details
- Streaming Sources

## Installation

Install the generated MyProvider.bin file in HexPlayer.

## Development

```bash
npm install
npm run build
```
```

---

# Plugin Testing Checklist

Before publishing, verify:

### Manifest

- [ ] Plugin ID is unique
- [ ] Plugin name is correct
- [ ] Version is correct
- [ ] API version is correct

### Home

- [ ] Home loads
- [ ] Categories appear
- [ ] Posters load
- [ ] Empty categories don't crash
- [ ] Network errors are handled

### Search

- [ ] Search works
- [ ] Empty search is handled
- [ ] No-result searches work
- [ ] Search errors are handled

### Movie Information

- [ ] Movie title appears
- [ ] Poster appears
- [ ] Description appears
- [ ] Year appears
- [ ] Genres appear

### Sources

- [ ] Source extraction works
- [ ] Returned URLs are valid
- [ ] Correct media type is returned
- [ ] Quality is returned where available

### TV

- [ ] Seasons work
- [ ] Episodes work
- [ ] Episode URLs are valid

### Build

- [ ] `npm run build` succeeds
- [ ] `.bin` is generated
- [ ] Plugin installs
- [ ] Plugin runs correctly

---

# Frequently Asked Questions

## Can I add my own Home categories?

Yes.

For example:

```javascript
{
    id: "bangla",
    title: "Bangla Movies",
    items: await getBangla()
}
```

The Android application will display the category dynamically.

---

## Do I need to modify the Android application?

Normally, no.

As long as your plugin follows the supported Plugin API, the Android application can load it without provider-specific Java code.

---

## Can I create a movie-only plugin?

Yes.

You can implement:

```text
Home.js
Search.js
MovieInfo.js
ExtractLink.js
```

and omit TV-specific functionality.

---

## Can I create a TV-only plugin?

Yes.

Add:

```text
Episodes.js
```

and return:

```javascript
type: "tv"
```

---

## Can I have many categories?

Yes.

There is no fixed category list.

Example:

```javascript
categories: [
    latest,
    trending,
    hindi,
    english,
    tamil,
    korean,
    japanese,
    action,
    comedy,
    drama
]
```

---

## Can different plugins have different categories?

Yes.

Categories belong to the plugin.

The Android application only renders the category data returned by the plugin.

---

## Can I use APIs?

Yes, provided you have permission to use them and comply with their terms.

Use:

```javascript
HexHttp.getJson()
```

where possible.

---

## Can I use external libraries?

Only libraries supported by the HexPlayer plugin runtime should be used.

The plugin should avoid dependencies that require Android-specific native code unless explicitly supported by the SDK.

---

## Can I distribute the JavaScript source?

You can publish source code on GitHub for open-source plugins.

For protected distribution, build the plugin into:

```text
MyPlugin.bin
```

---

# Final Architecture

The complete HexPlayer plugin ecosystem is:

```text
                         HEXPLAYER
                             │
                             ▼
                     Plugin Manager
                             │
                             ▼
                    MyPlugin.bin
                             │
                             ▼
                    JavaScript Runtime
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
       Home.js           Search.js        MovieInfo.js
          │                  │                  │
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                       ExtractLink.js
                             │
                             ▼
                         Sources
                             │
                             ▼
                       Media3 Player
```

The key design principle is:

> **Java controls the application. JavaScript controls the provider.**

The Android application does not need to know whether a provider has:

```text
3 categories
5 categories
20 categories
```

or:

```text
Latest
Trending
Hindi
Tamil
Korean
Anime
Drama
Action
Comedy
```

The plugin defines its own content structure, and HexPlayer renders it dynamically.

---

# License

The HexPlayer Plugin SDK license should be defined by the project owner.

Each third-party plugin may use its own license unless the SDK distribution terms require otherwise.

---

# Contributing

Contributions to the Plugin SDK are welcome.

Before submitting a plugin:

1. Test the plugin.
2. Follow the Plugin API.
3. Follow the manifest format.
4. Handle network errors.
5. Do not include private credentials.
6. Respect third-party provider terms.
7. Provide a clear README.
8. Use semantic versioning.

---

# Roadmap

Planned plugin API improvements may include:

```text
[ ] Home API
[ ] Search API
[ ] MovieInfo API
[ ] Episodes API
[ ] ExtractLink API
[ ] Subtitle API
[ ] Recommendations API
[ ] Genre API
[ ] HTTP API
[ ] Plugin permissions
[ ] Plugin validation
[ ] Plugin testing CLI
[ ] Plugin builder
[ ] BIN packaging
[ ] Plugin repository
[ ] Automatic plugin updates
```

---

## HexPlayer Plugin SDK

Build your provider.

Build it into `.bin`.

Install it in HexPlayer.

**One Android application.  
Unlimited JavaScript providers.**
