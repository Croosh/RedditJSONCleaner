
**Reddit JSON Cleaner**

A minimal web utility that takes raw Reddit API JSON responses and outputs clean, structured data optimized for LLM analysis and other downstream uses.

### What it does
Paste a Reddit post `.json` URL response (the kind you get from `reddit.com/r/.../.json`). It extracts the main post and comments, strips away the noisy wrapper objects, and lets you toggle which fields to keep. Output is available in JSON, YAML, or TOML.

### Features
- Removes Reddit's verbose listing structure (`kind`, `data`, `children`, etc.).
- Configurable fields: author, upvotes, subreddit, replies (nested), post metadata, engagement stats, timestamps, flair.
- Real-time size and token reduction stats.
- Syntax-highlighted editor with Prism.
- Copy output with one click.
- No backend, runs entirely in the browser.

### Live version
https://redditjsoncleaner.croosh.workers.dev/

### Screenshots
![App interface](https://iad.microlink.io/-ZXPFqJF3UdYyVRGAjjSmTebD2moOJfG3Fb-d77H0KN5Mgvm3wxbVd0h-MXT56rEEkbGCVrtaADO9TQhio7NhA.png)

### Local development

```bash
git clone <repository-url>
cd reddit-json-cleaner
```

Install dependencies:

```bash
npm install
```

Copy the environment example if needed:

```bash
cp .env.example .env
```

Start the dev server:

```bash
npm run dev
```

The app will be available at http://localhost:3000 (or the port shown in terminal).

Build for production:

```bash
npm run build
```

The output goes to the `dist/` folder.

### Tech stack
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Prism.js for syntax highlighting
- YAML and TOML support for output formats

### Project structure (relevant files)
- `src/App.tsx` — main logic and UI
- `src/main.tsx` — entry point
- `vite.config.ts` — build configuration
- `index.html` — base template

The tool is deliberately lightweight with no external API calls after the initial page load.

### Limitations
- Only handles the standard Reddit post + comments JSON format (two listings array).
- Deeply nested replies are supported but can get large if not toggled off.
- Very large threads may slow down the browser due to client-side processing.
