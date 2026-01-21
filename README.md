# Cloudflare Custom Pages

A scalable collection of custom pages for Cloudflare Secure Web Gateway (SWG) and user coaching, providing clear, informative feedback and security awareness training.

## Overview

This project implements a Cloudflare Worker that serves multiple custom pages:
- **Block Page** (`/gateway/`) - Displays policy context when access is blocked by SWG
- **Coaching Page** (`/coaching/`) - User security awareness and training (coming soon)
- **Future pages** - Easily add more custom pages as needed

The architecture is designed to be scalable and maintainable, with shared components and a build system that bundles multiple pages into a single worker.

## Features

### 🎨 Modern UI/UX
- **Dual Theme Support**: Light theme (default) and dark theme with manual toggle button
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Eye-Friendly Colors**: Carefully selected color schemes to reduce eye strain
- **Smooth Animations**: Subtle transitions and hover effects for better user experience

### 📋 Policy Information Display
- **Dynamic Block Reason**: Shows the blocked URL and categories with color highlighting
- **Collapsible Details**: Policy context details section starts collapsed for cleaner view
- **Technical Information**: Device ID, Rule ID, Source IP, and Account ID in footer
- **Copy Functionality**: One-click button to copy all technical details for IT support

### 🔧 Technical Features
- **Query Parameter Parsing**: Automatically extracts and displays all Cloudflare SWG context fields
- **Multiple Category Support**: Handles multiple category values for blocked content
- **Theme Persistence**: User's theme preference saved in localStorage
- **System Preference Detection**: Respects OS/browser dark mode settings

## Project Structure

```
cf-custom-pages/
├── src/
│   ├── pages/
│   │   ├── gateway/
│   │   │   └── block.html          # Gateway block page
│   │   └── coaching/
│   │       └── index.html          # User coaching page
│   ├── shared/
│   │   ├── styles/
│   │   │   └── theme.css           # Shared theme variables
│   │   └── scripts/
│   │       └── theme-toggle.js     # Shared theme toggle logic
│   ├── worker-template.js          # Worker template with placeholders
│   └── build.js                    # Build script to bundle pages
├── worker.js                       # Generated worker (auto-built, git ignored)
├── wrangler.toml                   # Cloudflare Worker config (git ignored)
├── wrangler.toml.example           # Configuration template
├── package.json                    # Dependencies and build scripts
├── .gitignore
└── README.md
```

### Directory Explanation

- **`src/pages/`** - Each subdirectory contains a complete HTML page
- **`src/shared/`** - Reusable CSS and JavaScript across all pages
- **`src/build.js`** - Bundles HTML pages into the worker
- **`worker.js`** - Auto-generated, deployed to Cloudflare (not in git)

## Deployment

### Prerequisites
- Node.js 16+ installed
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler` or use local version)
- API token with Workers permissions

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Account**
   ```bash
   export CLOUDFLARE_API_TOKEN="your-api-token"
   ```

3. **Create Configuration**
   Copy `wrangler.toml.example` to `wrangler.toml` and update:
   ```bash
   cp wrangler.toml.example wrangler.toml
   ```
   
   Edit `wrangler.toml` with your account ID:
   ```toml
   name = "cfone-custom-pages"
   main = "worker.js"
   compatibility_date = "2024-01-01"
   
   account_id = "your-account-id-here"
   
   [[routes]]
   pattern = "access.0security.net/*"
   zone_name = "0security.net"
   ```

4. **Build and Deploy**
   ```bash
   npm run deploy
   ```
   
   Or build and deploy separately:
   ```bash
   npm run build      # Bundles pages into worker.js
   wrangler deploy    # Deploys to Cloudflare
   ```

### Development

**Local Testing**
```bash
npm run dev
```
This builds the worker and starts a local development server.

## Configuration in Cloudflare SWG

1. Navigate to **Zero Trust** > **Gateway** > **Firewall Policies**
2. Edit your block policy
3. Set **Block page** to: `https://access.0security.net/gateway/`
4. Cloudflare will automatically append policy context as query parameters

## Query Parameters

The block page expects these query parameters from Cloudflare SWG:

| Parameter | Description |
|-----------|-------------|
| `cf_site_uri` | The blocked URL |
| `cf_request_category_names` | Content categories (can be multiple) |
| `cf_application_name` | Application name if detected |
| `cf_policy_name` | Name of the blocking policy |
| `cf_rule_id` | Unique rule identifier |
| `cf_device_id` | User's device identifier |
| `cf_source_ip` | User's source IP address |
| `cf_account_id` | Cloudflare account ID |

## Adding New Pages

The architecture makes it easy to add new custom pages:

1. **Create Page Directory**
   ```bash
   mkdir -p src/pages/your-page-name
   ```

2. **Add HTML File**
   Create `src/pages/your-page-name/index.html` with your page content

3. **Update Worker Template**
   Edit `src/worker-template.js`:
   - Add route in the `fetch()` handler
   - Add a new serve function
   - Add placeholder in template

4. **Update Build Script**
   Edit `src/build.js` to read and bundle your new page

5. **Build and Test**
   ```bash
   npm run build
   npm run dev
   ```

### Example: Adding a "Terms" Page

```javascript
// In src/worker-template.js
if (path === '/terms/' || path === '/terms') {
  return serveTermsPage(url);
}

function serveTermsPage(url) {
  const termsPageHTML = `__TERMS_PAGE_HTML__`;
  return new Response(termsPageHTML, {
    headers: { 'content-type': 'text/html;charset=UTF-8' }
  });
}
```

## Customization

### Branding
- Update logo SVG in the header section
- Modify company name "Zero Security Corp"
- Change footer text and copyright

### Colors
- Edit CSS variables in `:root` for light theme
- Edit CSS variables in `:root[data-theme="dark"]` for dark theme

### Contact Information
- Update IT support email: `it@0security.net`
- Update intranet URL: `https://intranet.corp.0security.net`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Proprietary - Zero Security Corp

## Support

For issues or questions, contact IT support at it@0security.net
