# Cloudflare Custom Pages

Custom pages for Cloudflare Secure Web Gateway (SWG) and Cloudflare Access, providing clear feedback and security information.

## Features

### Gateway Block Page (`/cf-gateway/`)
- Displays policy context when access is blocked by SWG
- Shows blocked URL, categories, and policy details
- Dual theme support (light/dark)
- Responsive design
- Copy technical details for IT support

### Access Info Page (`/cf-access/`)
- Displays user identity and device information
- Shows WARP status and security posture
- Device details (name, model, OS version)
- Posture checks (Crowdstrike, OS updates)
- Leverages Cloudflare Access authentication

### Coaching Page (`/coaching/`)
- Security awareness and training (coming soon)

## Project Structure

```
cfone-custom-pages/
├── src/
│   ├── pages/
│   │   ├── cf-gateway/block.html
│   │   ├── cf-access/
│   │   │   ├── index.html
│   │   │   └── scripts/
│   │   │       ├── warpinfo.js
│   │   │       ├── deviceinfo.js
│   │   │       └── postureinfo.js
│   │   └── coaching/index.html
│   ├── shared/
│   │   ├── styles/theme.css
│   │   └── scripts/theme-toggle.js
│   ├── worker-template.js
│   └── build.js
├── main.js (auto-generated)
├── wrangler.jsonc (gitignored)
├── wrangler.example.jsonc
├── ARCHITECTURE.md
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 16+
- Cloudflare account
- Wrangler CLI

### Installation

```bash
# Install dependencies
npm install

# Copy and configure wrangler.jsonc
cp wrangler.example.jsonc wrangler.jsonc
# Edit wrangler.jsonc with your account_id and routes

# Build and deploy
npm run deploy
```

### Development

```bash
# Build worker
npm run build

# Local development
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## Configuration

### Gateway Block Page

1. Navigate to **Zero Trust** → **Gateway** → **Firewall Policies**
2. Edit your block policy
3. Set **Block page** to: `https://access.example.com/cf-gateway/`
4. Cloudflare appends policy context as query parameters

### Access Info Page

1. Configure Cloudflare Access for your domain
2. Set cookie domain to `.example.com` (wildcard)
3. Users authenticate once, access `/cf-access/` without re-login
4. Optional: Configure `BEARER_TOKEN` secret for enhanced device/posture data

```bash
# Set Bearer token for API calls
wrangler secret put BEARER_TOKEN
```

**Bearer Token Permissions:**
- Zero Trust → Devices → Read
- Zero Trust → Device Posture → Read

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed authentication flow.

## Query Parameters

Gateway block page expects these from Cloudflare SWG:

| Parameter | Description |
|-----------|-------------|
| `cf_site_uri` | Blocked URL |
| `cf_request_category_names` | Content categories |
| `cf_policy_name` | Blocking policy name |
| `cf_rule_id` | Rule identifier |
| `cf_device_id` | Device identifier |
| `cf_source_ip` | Source IP address |
| `cf_account_id` | Account ID |

## Adding New Pages

1. Create page directory: `src/pages/your-page/`
2. Add HTML file: `src/pages/your-page/index.html`
3. Update `src/worker-template.js` with route and serve function
4. Update `src/build.js` to bundle the page
5. Build and test: `npm run build && npm run dev`

## Best Practices

### Security
- `wrangler.jsonc` is gitignored (contains account/domain info)
- Use `wrangler.example.jsonc` as template
- Bearer token stored as Wrangler secret (never in code)
- HttpOnly cookies prevent XSS
- Secure flag ensures HTTPS only

### Development
- Build before deploying: `npm run build`
- Test locally: `npm run dev`
- Use semantic versioning for releases
- Keep ARCHITECTURE.md updated

### Code Quality
- Console logs only in build script
- Error handling in all async functions
- Consistent code formatting
- Comments for complex logic

## Troubleshooting

**Cookie Not Sent (401 errors)**
- Check cookie domain is `.example.com` (with leading dot)
- Verify HTTPS is used
- Ensure cookie hasn't expired

**Device/Posture Data Empty**
- Verify `BEARER_TOKEN` is configured: `wrangler secret list`
- Check Bearer token has correct permissions
- Verify `account_id` exists in identity data

**Worker Logs**
```bash
# View real-time logs
wrangler tail

# View specific deployment logs
wrangler tail --format=pretty
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Proprietary

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Authentication flow and technical details
- [Cloudflare Access Docs](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/)
- [Workers Docs](https://developers.cloudflare.com/workers/)
