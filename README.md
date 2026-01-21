# Cloudflare Custom Pages

A custom block page for Cloudflare Secure Web Gateway (SWG) that provides users with clear, informative feedback when access to a website is blocked by security policies.

## Overview

This project implements a Cloudflare Worker that serves a custom block page at `https://access.0security.net/gateway/`. The page displays policy context information from Cloudflare SWG in a user-friendly interface with modern design and accessibility features.

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
.
├── worker.js           # Cloudflare Worker script (main deployment file)
├── block.html          # Standalone HTML for testing/preview
├── wrangler.toml       # Cloudflare Worker configuration
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## Deployment

### Prerequisites
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- API token with Workers permissions

### Steps

1. **Configure Account**
   ```bash
   export CLOUDFLARE_API_TOKEN="your-api-token"
   ```

2. **Update Configuration**
   Edit `wrangler.toml` with your account ID and route:
   ```toml
   name = "cfone-custom-pages"
   main = "worker.js"
   compatibility_date = "2024-01-01"
   
   account_id = "your-account-id"
   
   [[routes]]
   pattern = "access.0security.net/*"
   zone_name = "0security.net"
   ```

3. **Deploy**
   ```bash
   wrangler deploy
   ```

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
