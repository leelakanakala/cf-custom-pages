# Architecture Documentation

## 📐 Project Structure Explained

This document explains the purpose of each component in the project and why the architecture is designed this way.

## Core Components

### 1. **`src/pages/gateway/block.html`** - Source HTML File
**Purpose**: The actual block page content you edit  
**Why separate HTML?**: ✅ **Best Practice**
- Easier to edit HTML than escaped JavaScript strings
- Syntax highlighting and validation work properly
- Can preview in browser during development
- Clean separation of concerns (content vs logic)

**Example**: You edit this file to change the UI, add fields, update styling, etc.

### 2. **`src/build.js`** - Build Script
**Purpose**: Reads HTML files and bundles them into `worker.js`  
**What it does**:
1. Reads `src/pages/gateway/block.html`
2. Escapes special characters (backticks, dollar signs, backslashes)
3. Injects HTML into `worker-template.js` placeholders
4. Outputs final `worker.js`

**Why needed?**: Cloudflare Workers require JavaScript, not HTML files. This script transforms your HTML into deployable JavaScript.

**Run it**: `npm run build`

### 3. **`src/worker-template.js`** - Worker Blueprint
**Purpose**: Template with routing logic and placeholders  
**Contains**:
- Route handlers (`/gateway/`, `/coaching/`, etc.)
- Placeholder strings like `__GATEWAY_PAGE_HTML__`
- Response headers and caching logic

**Why separate?**: Keeps routing logic separate from page content. When you add a new page, you update this template.

### 4. **`worker.js`** - Generated Output (Git Ignored)
**Purpose**: The actual file deployed to Cloudflare  
**Status**: Auto-generated, should NOT be edited manually  
**Why git ignored?**: It's a build artifact, like compiled code

**Deployment**: This is what `wrangler deploy` uploads to Cloudflare

### 5. **`src/shared/`** - Shared Resources (Future Use)
**Purpose**: Reusable CSS/JS across multiple pages  
**Current status**: Placeholder for future expansion  
**When to use**: When you have 3+ pages with common code

**Example use case**:
```
src/shared/
├── styles/
│   └── theme.css        # Shared theme variables
└── scripts/
    └── theme-toggle.js  # Shared theme switching logic
```

Currently not actively used because you only have one page. Will be valuable when you add coaching pages, terms, privacy policy, etc.

## Architecture Decision: Why This Approach?

### ✅ **Advantages**
1. **Scalability**: Easy to add new pages (coaching, terms, privacy)
2. **Maintainability**: HTML is easier to edit than escaped strings
3. **Developer Experience**: Proper syntax highlighting and validation
4. **Industry Standard**: Common pattern for multi-page workers
5. **Clean Separation**: Content (HTML) vs Logic (routing) vs Build (tooling)

### ❌ **Disadvantages**
1. **Complexity**: More files to understand initially
2. **Build Step**: Must run `npm run build` before deploying
3. **Overhead**: Might be overkill for a single page

## Can `build.js` and `worker.js` be combined?

**No, they serve fundamentally different purposes:**

| Component | Purpose | Runs On | Type |
|-----------|---------|---------|------|
| `build.js` | Build tool | Your machine | Node.js script |
| `worker.js` | Runtime code | Cloudflare edge | Deployed code |

**Analogy**:
- `build.js` = Compiler (like `gcc` or `tsc`)
- `worker.js` = Compiled output (like `a.out` or `main.js`)

You wouldn't combine a compiler with its output!

## Alternative: Simplified Single-Page Architecture

If you **only** have one page and **never** plan to add more:

```
cfone-custom-pages/
├── worker.js          # Edit this directly with embedded HTML
├── wrangler.jsonc     # Config
└── package.json       # Dependencies
```

**Pros**: Simpler, fewer files  
**Cons**: Hard to maintain, no scalability, poor developer experience

**Recommendation**: Keep current architecture since you mentioned future pages (coaching, etc.)

## Workflow

### Development
```bash
# 1. Edit HTML
vim src/pages/gateway/block.html

# 2. Build worker
npm run build

# 3. Test locally
npm run dev

# 4. Deploy
npm run deploy
```

### Adding a New Page
```bash
# 1. Create HTML
mkdir -p src/pages/terms
vim src/pages/terms/index.html

# 2. Update worker-template.js
# Add route: if (path === '/terms/') { return serveTermsPage(url); }

# 3. Update build.js
# Read terms HTML and add to replacements

# 4. Build and deploy
npm run build
npm run deploy
```

## Summary

**Keep this architecture because**:
- ✅ You plan to add more pages (coaching, etc.)
- ✅ Easier to maintain HTML separately
- ✅ Industry standard approach
- ✅ Scales well as project grows

**The `shared/` directory** is currently unused but will be valuable when you have multiple pages sharing common code.
