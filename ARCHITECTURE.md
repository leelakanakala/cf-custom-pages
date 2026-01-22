# Cloudflare Access Architecture

This document explains the authentication flow and architecture for the Cloudflare Access information page.

## Overview

The `/cf-access` page displays comprehensive user identity, device information, and security posture for authenticated users. It leverages Cloudflare's official identity and device APIs to provide real-time access control information without requiring separate authentication. The page integrates with existing Cloudflare Access authentication from protected routes (e.g., `intranet.0security.net`, `openwebui.0security.net`).

## Authentication Flow

### 1. Initial Authentication (Starting from Protected Resource)
```
User → intranet.0security.net (or any protected resource)
  ↓
Cloudflare Access checks authentication
  ↓
No valid CF_Authorization cookie found
  ↓
User → 0security.cloudflareaccess.com/cdn-cgi/access/login
  Query params: redirect=intranet.0security.net
  ↓
User authenticates (email, SSO, SAML, etc.)
  ↓
Cloudflare Access validates credentials
  ↓
Sets cookies in HTTP response (302 redirect):
  Set-Cookie: CF_Authorization=<jwt_token>; 
    Domain=.0security.net; 
    Path=/; 
    HttpOnly; 
    Secure; 
    SameSite=Lax
  
  Set-Cookie: CF-Access-Authenticated-User-Email=<user_email>; 
    Domain=.0security.net; 
    Path=/; 
    Secure
  ↓
302 Redirect → intranet.0security.net
  Browser includes CF_Authorization cookie (same domain)
  ↓
User accesses protected resource successfully
```

### 2. Accessing cf-access Page (Using Existing Authentication)
```
User (already authenticated) → access.0security.net/cf-access
  ↓
Browser automatically sends cookies for .0security.net domain:
  Cookie: CF_Authorization=<jwt_token>
  ↓
Cloudflare Access validates token (if /cf-access route is protected by Access policy)
  OR
Worker receives request with cookie (if /cf-access route is NOT protected by Access)
  ↓
Cloudflare adds Cf-Access-Jwt-Assertion header (if Access is active on domain)
  ↓
Worker serves HTML page
  ↓
No re-authentication needed ✓
```

**What is a "route" in this context?**

A **route** refers to a URL path pattern that can be protected by Cloudflare Access. In Cloudflare Zero Trust:

- **Route** = URL path or pattern (e.g., `/cf-access`, `/cf-access/*`, `/admin/*`)
- **Access Application** = Configuration that protects specific routes
- **Access Policy** = Rules that determine who can access those routes

**Examples:**

1. **Protected Route:**
   ```
   Application: "CF Access Info Page"
   Domain: access.0security.net
   Path: /cf-access
   Policy: Allow users with email ending in @0security.net
   
   Result: /cf-access route requires authentication
   ```

2. **Unprotected Route:**
   ```
   No Access Application configured for /cf-access
   
   Result: /cf-access route is publicly accessible (or relies on existing auth)
   ```

**In your setup:**
- `/cf-access` route can be **unprotected** because it relies on cookies from other protected routes
- Other routes like `intranet.0security.net/*` are **protected** and require authentication
- The cookie from protected routes works on unprotected routes (same domain scope)

### 3. Data Fetching Flow (Within cf-access Page)
```
Browser → Worker (access.0security.net/cf-access)
  Headers:
    - Cookie: CF_Authorization=<jwt_token>
    - Cf-Access-Jwt-Assertion: <jwt_token> (added by Cloudflare)
  ↓
Worker serves HTML page
  ↓
Browser executes JavaScript
  ↓
JavaScript → Worker API (/cf-access/api/identity)
  Headers:
    - Cookie: CF_Authorization=<jwt_token>
  ↓
Worker extracts credentials and forwards to identity endpoint
  ↓
Worker → /cdn-cgi/access/get-identity
  Headers:
    - Cookie: CF_Authorization=<jwt_token>
    - Cf-Access-Jwt-Assertion: <jwt_token>
  ↓
Cloudflare Access validates token
  ↓
Returns identity data (user info, device info, WARP status)
  ↓
Worker → Browser (JSON response)
  ↓
JavaScript renders data in tiles
```

## Key Components

### Cookies

#### `CF_Authorization`
- **Type**: JWT token (HttpOnly, Secure)
- **Domain**: `.0security.net` (wildcard for all subdomains)
- **Purpose**: Primary authentication token set by Cloudflare Access
- **Lifespan**: Based on Access session duration configuration
- **Visibility**: Not accessible to JavaScript (HttpOnly flag)
- **Transmission**: Automatically sent by browser with same-domain requests

### Headers

#### `Cf-Access-Jwt-Assertion`
- **Type**: JWT token
- **Added by**: Cloudflare Access infrastructure (automatic)
- **Purpose**: Server-side authentication token for worker/backend use
- **Contains**: User identity claims (email, groups, etc.)
- **Availability**: Only in requests to protected routes
- **Use case**: Allows worker to verify authentication without parsing cookies

### Endpoints

#### `/cf-access/` (Main Page)
- **Protection**: Optional (can be unprotected if leveraging existing auth)
- **Purpose**: Serves the HTML interface with three information tiles and debug section
- **Authentication**: Inherited from domain-wide Access policy
- **Features**:
  - User Information tile (name, email, WARP status, groups)
  - Device Information tile (name, model, OS version, serial number, device ID)
  - Device Posture tile (Crowdstrike status, OS update status)
  - Debug section with syntax-highlighted JSON viewer
  - "Reload Access Application" button to retry original URL

#### `/cf-access/api/identity` (Worker API - Legacy)
- **Protection**: Unprotected (validates credentials internally)
- **Purpose**: Simple proxy endpoint to fetch basic identity data
- **Method**: GET
- **Request Headers**:
  - `Cookie: CF_Authorization=<token>`
  - `Cf-Access-Jwt-Assertion: <token>` (added by Cloudflare)
- **Response**: JSON with user and device information
- **Error Codes**:
  - `401`: No authentication credentials found
  - `500`: Failed to fetch identity data
- **Note**: This endpoint is being phased out in favor of `/cf-access/api/userdetails`

#### `/cf-access/api/userdetails` (Worker API - Enhanced)
- **Protection**: Unprotected (validates credentials internally)
- **Purpose**: Comprehensive endpoint combining identity, device details, and posture data
- **Method**: GET
- **Request Headers**:
  - `Cf-Access-Jwt-Assertion: <token>` (required, added by Cloudflare)
- **Authentication Flow**:
  1. Extracts `device_id` from JWT token payload
  2. Fetches identity data from `/cdn-cgi/access/get-identity`
  3. Fetches device details from Cloudflare API (if Bearer token configured)
  4. Fetches device posture from Cloudflare API (if Bearer token configured)
  5. Returns combined data structure
- **Response Structure**:
  ```json
  {
    "identity": {
      "name": "David Liu",
      "email": "david@0security.net",
      "groups": [
        {"name": "SG-Role-Developers", "email": "..."},
        {"name": "Cloudflare", "email": "..."}
      ],
      "device_sessions": [...],
      "gateway_account_id": "..."
    },
    "device": {
      "result": {
        "id": "...",
        "name": "David's MacBook Pro",
        "model": "Mac",
        "os_version": "macOS 15.2",
        "serial_number": "..."
      }
    },
    "posture": {
      "result": {
        "checks": [
          {
            "type": "crowdstrike",
            "success": true,
            "name": "Crowdstrike Check"
          },
          {
            "type": "os_version",
            "success": true,
            "name": "OS Version Check"
          }
        ]
      }
    }
  }
  ```
- **Error Codes**:
  - `401`: Unauthorized - No JWT assertion found
  - `400`: Device ID not found in identity data
  - `500`: Internal Server Error
- **Environment Variables**:
  - `BEARER_TOKEN`: Cloudflare API token with Zero Trust permissions (optional)
  - If not configured, only identity data is returned (device and posture will be empty objects)

#### `/cdn-cgi/access/get-identity` (Cloudflare Managed)
- **Protection**: Requires valid CF_Authorization cookie or JWT assertion
- **Purpose**: Returns authenticated user's identity information
- **Managed by**: Cloudflare Access (not your worker)
- **Available on**: Any domain protected by Cloudflare Access
- **Response**: JSON with identity data including:
  - User email, name
  - User groups (array of objects with name, email, id)
  - Device sessions with device information
  - WARP status
  - Gateway account ID
  - Device posture information (basic)

#### Cloudflare API Endpoints (External)

##### `GET /accounts/{account_id}/devices/{device_id}`
- **Purpose**: Fetch detailed device information from Cloudflare API
- **Authentication**: Bearer token with Zero Trust read permissions
- **Called by**: Worker `fetchDeviceDetails()` function
- **Response**: Detailed device information including name, model, OS version, serial number

##### `GET /accounts/{account_id}/devices/{device_id}/posture/check`
- **Purpose**: Fetch device posture check results from Cloudflare API
- **Authentication**: Bearer token with Zero Trust read permissions
- **Query Parameters**: `enrich=false`
- **Called by**: Worker `fetchDevicePosture()` function
- **Response**: Array of posture check results (Crowdstrike, OS version, etc.)

### JavaScript Files

#### `warpinfo.js`
- **Purpose**: Processes WARP user information from identity data
- **Function**: `getWarpInfo(identityData)`
- **Parameters**:
  - `identityData`: Identity object from `/cf-access/api/userdetails`
- **Processing**:
  - Fetches WARP status from `https://www.cloudflare.com/cdn-cgi/trace`
  - Extracts user groups from identity data (handles both string arrays and object arrays)
  - Maps group objects to extract `name`, `email`, or `id` properties
- **Returns**:
  ```javascript
  {
    userName: "David Liu",
    userEmail: "david@0security.net",
    isWarpEnabled: true,
    userGroups: ["SG-Role-Developers", "Cloudflare"]
  }
  ```
- **Error Handling**: Throws error if identity data contains error property

#### `deviceinfo.js`
- **Purpose**: Processes device information from identity and API data
- **Function**: `getDeviceInfo(identityData, deviceId, apiDeviceData)`
- **Parameters**:
  - `identityData`: Identity object from `/cf-access/api/userdetails`
  - `deviceId`: Device ID extracted from JWT token
  - `apiDeviceData`: Enhanced device data from Cloudflare API (optional)
- **Processing**:
  - Prioritizes API device data over identity data
  - Falls back to identity data if API data unavailable
  - Extracts device ID from JWT token as primary source
- **Returns**:
  ```javascript
  {
    deviceId: "5fa7ba55-e2d9-11f0-8372-5631db5f3677",
    deviceName: "David's MacBook Pro",
    deviceModel: "Mac",
    deviceOsVersion: "macOS 15.2",
    deviceSerial: "C02ABC123DEF"
  }
  ```
- **Error Handling**: Throws error if identity data contains error property

#### `postureinfo.js`
- **Purpose**: Processes device posture check results
- **Function**: `getPostureInfo(identityData, apiPostureData)`
- **Parameters**:
  - `identityData`: Identity object from `/cf-access/api/userdetails`
  - `apiPostureData`: Enhanced posture data from Cloudflare API (optional)
- **Processing**:
  - Prioritizes API posture data over identity data
  - Searches for Crowdstrike check by type or name
  - Searches for OS version check by type or name
  - Defaults to `true` for OS update status if check not found
- **Returns**:
  ```javascript
  {
    crowdstrikeEnabled: true,
    osUpToDate: true
  }
  ```
- **Error Handling**: Throws error if identity data contains error property

## Cookie Domain Configuration

### Understanding Cookie Domain Scope

When Cloudflare Access sets the `CF_Authorization` cookie, the domain attribute determines where the cookie is valid.

#### Domain: `.0security.net` (Wildcard Domain)

The leading dot (`.`) makes the cookie available to **all subdomains**:

```
Cookie Set At: intranet.0security.net
Cookie Domain: .0security.net (wildcard)

Cookie Available On:
✓ intranet.0security.net     → Can read cookie (where it was set)
✓ openwebui.0security.net    → Can read cookie (different subdomain)
✓ access.0security.net       → Can read cookie (different subdomain)
✓ api.0security.net          → Can read cookie (any subdomain)
✓ 0security.net              → Can read cookie (apex domain)
✗ different-domain.com       → Cannot read cookie (different domain)
✗ 0security.org              → Cannot read cookie (different TLD)
```

#### How Cookie Scope Works in Practice

**Scenario 1: User authenticates at intranet.0security.net**
```
1. User → intranet.0security.net
2. Cloudflare Access redirects to login
3. After authentication, sets:
   Set-Cookie: CF_Authorization=<token>; Domain=.0security.net
4. Redirects back to intranet.0security.net
5. Cookie is now available on ALL *.0security.net subdomains
```

**Scenario 2: User visits access.0security.net/cf-access**
```
1. User → access.0security.net/cf-access
2. Browser checks cookies for .0security.net domain
3. Finds CF_Authorization cookie (set earlier at intranet.0security.net)
4. Automatically includes cookie in request
5. No re-authentication needed ✓
```

**Scenario 3: User visits openwebui.0security.net**
```
1. User → openwebui.0security.net
2. Browser sends CF_Authorization cookie (same domain scope)
3. Cloudflare Access validates existing token
4. Access granted without login ✓
```

### Cookie Attributes Explained

```http
Set-Cookie: CF_Authorization=eyJhbGc...xyz; 
  Domain=.0security.net;      ← Available on all *.0security.net
  Path=/;                     ← Available on all paths
  HttpOnly;                   ← Not accessible via JavaScript
  Secure;                     ← Only sent over HTTPS
  SameSite=Lax;              ← Sent on top-level navigation
  Max-Age=86400               ← Expires after 24 hours (example)
```

**Attribute Details:**
- **Domain=.0security.net**: Wildcard - works across all subdomains
- **Path=/**: Cookie sent for all paths on the domain
- **HttpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Only transmitted over HTTPS connections
- **SameSite=Lax**: Allows cookie on cross-site top-level navigation (e.g., clicking a link)
- **Max-Age**: Session duration configured in Cloudflare Access

### Single Sign-On (SSO) Behavior

With the wildcard domain cookie, users get seamless SSO across all subdomains:

**Flow:**
1. User authenticates at `intranet.0security.net`
2. Cookie is set for `.0security.net`
3. User clicks link to `access.0security.net/cf-access`
4. Browser automatically sends the cookie (same domain scope)
5. **No re-authentication required** ✓
6. User can access `openwebui.0security.net` without re-authenticating ✓
7. User can access any `*.0security.net` resource without re-authenticating ✓

### What Happens Without Wildcard Domain?

If the cookie was set for `intranet.0security.net` (without the leading dot):

```
Cookie Domain: intranet.0security.net (specific subdomain)

Cookie Available On:
✓ intranet.0security.net     → Can read cookie
✗ access.0security.net       → Cannot read cookie (different subdomain)
✗ openwebui.0security.net    → Cannot read cookie (different subdomain)

Result: User must re-authenticate at each subdomain ✗
```

### Configuring Cookie Domain in Cloudflare Access

The cookie domain is configured in your Cloudflare Access application settings:

1. **Zero Trust Dashboard** → Access → Applications
2. Select your application
3. **Cookie Settings** (may be in Advanced Settings)
4. **Cookie Domain**: Set to `.0security.net` (with leading dot)
5. This ensures SSO across all subdomains

## Worker Implementation

### Route Handling
```javascript
// Main routes
if (path === '/cf-access/' || path === '/cf-access') {
  return serveAccessPage(url);
} else if (path === '/cf-access/api/identity') {
  return getIdentityFromJWT(request);
} else if (path === '/cf-access/api/userdetails') {
  return handleUserDetails(request, env);
} else if (path === '/cf-access/scripts/warpinfo.js') {
  return serveWarpInfoScript();
} else if (path === '/cf-access/scripts/deviceinfo.js') {
  return serveDeviceInfoScript();
} else if (path === '/cf-access/scripts/postureinfo.js') {
  return servePostureInfoScript();
}
```

### Worker Functions

#### `getDeviceIdFromToken(jwt)`
- **Purpose**: Extracts device_id from JWT token payload
- **Parameters**: `jwt` - JWT token string
- **Implementation**:
  ```javascript
  function getDeviceIdFromToken(jwt) {
    const [header, payload, signature] = jwt.split(".");
    if (payload) {
      try {
        const decoded = JSON.parse(
          atob(payload.replace(/_/g, "/").replace(/-/g, "+"))
        );
        return decoded.device_id || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  ```
- **Returns**: Device ID string or null
- **Error Handling**: Returns null on decode errors

#### `getIdentityFromJWT(request)`
- **Purpose**: Fetches basic identity data from Cloudflare Access (legacy endpoint)
- **Parameters**: `request` - Incoming HTTP request
- **Implementation**:
  ```javascript
  async function getIdentityFromJWT(request) {
    const jwtAssertion = request.headers.get("Cf-Access-Jwt-Assertion");
    
    if (!jwtAssertion) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }
    
    const identityUrl = `${url.protocol}//${url.host}/cdn-cgi/access/get-identity`;
    const identityResponse = await fetch(identityUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `CF_Authorization=${jwtAssertion}`
      }
    });
    
    const identityData = await identityResponse.json();
    return new Response(JSON.stringify(identityData), {
      headers: { 'content-type': 'application/json' }
    });
  }
  ```
- **Returns**: JSON response with identity data
- **Error Codes**: 401 (Unauthorized), 500 (Internal Server Error)

#### `fetchDeviceDetails(account_id, device_id, bearerToken)`
- **Purpose**: Fetches detailed device information from Cloudflare API
- **Parameters**:
  - `account_id`: Cloudflare account ID (from `identity.account_id`)
  - `device_id`: Device identifier
  - `bearerToken`: Cloudflare API token
- **API Endpoint**: `https://api.cloudflare.com/client/v4/accounts/{account_id}/devices/{device_id}`
- **Implementation**:
  ```javascript
  async function fetchDeviceDetails(account_id, device_id, bearerToken) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${account_id}/devices/${device_id}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bearerToken}`
      }
    });
    
    if (!response.ok) {
      return { error: `Failed to fetch device details: ${response.status}` };
    }
    
    return await response.json();
  }
  ```
- **Returns**: Device details object or error object
- **Required Permissions**: Zero Trust → Read

#### `fetchDevicePosture(account_id, device_id, bearerToken)`
- **Purpose**: Fetches device posture check results from Cloudflare API
- **Parameters**:
  - `account_id`: Cloudflare account ID (from `identity.account_id`)
  - `device_id`: Device identifier
  - `bearerToken`: Cloudflare API token
- **API Endpoint**: `https://api.cloudflare.com/client/v4/accounts/{account_id}/devices/{device_id}/posture/check?enrich=false`
- **Implementation**:
  ```javascript
  async function fetchDevicePosture(account_id, device_id, bearerToken) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${account_id}/devices/${device_id}/posture/check?enrich=false`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bearerToken}`
      }
    });
    
    if (!response.ok) {
      return { error: `Failed to fetch device posture: ${response.status}` };
    }
    
    return await response.json();
  }
  ```
- **Returns**: Posture check results object or error object
- **Required Permissions**: Zero Trust Devices → Read

#### `handleUserDetails(request, env)`
- **Purpose**: Comprehensive endpoint combining identity, device, and posture data
- **Parameters**:
  - `request`: Incoming HTTP request
  - `env`: Worker environment variables
- **Flow**:
  1. Extract JWT assertion from request headers
  2. Extract device_id from JWT token using `getDeviceIdFromToken()`
  3. Fetch identity data using `getIdentityFromJWT()`
  4. If Bearer token configured:
     - Fetch device details using `fetchDeviceDetails()`
     - Fetch device posture using `fetchDevicePosture()`
  5. Combine all data into single response
- **Implementation**:
  ```javascript
  async function handleUserDetails(request, env) {
    const jwtAssertion = request.headers.get("Cf-Access-Jwt-Assertion");
    let device_id = getDeviceIdFromToken(jwtAssertion);
    
    const identityResponse = await getIdentityFromJWT(request);
    const identityData = await identityResponse.json();
    const account_id = identityData.account_id;
    
    const bearerToken = env?.BEARER_TOKEN;
    let deviceDetailsData = {};
    let devicePostureData = {};
    
    if (bearerToken && account_id && device_id) {
      deviceDetailsData = await fetchDeviceDetails(account_id, device_id, bearerToken);
      devicePostureData = await fetchDevicePosture(account_id, device_id, bearerToken);
    }
    
    return new Response(JSON.stringify({
      identity: identityData,
      device: deviceDetailsData,
      posture: devicePostureData
    }), {
      headers: { 'content-type': 'application/json' }
    });
  }
  ```
- **Returns**: Combined JSON response
- **Environment Variables**: `BEARER_TOKEN` (optional)

### Why the Worker Proxy?

The worker acts as a proxy and data aggregator because:
1. **Cookie forwarding**: Browser cookies aren't automatically forwarded in fetch requests
2. **API aggregation**: Combines multiple API calls into single response
3. **Error handling**: Centralized error handling and logging
4. **Token management**: Securely stores and uses Bearer token for API calls
5. **Response formatting**: Consistent JSON response format
6. **Future extensibility**: Easy to add caching, rate limiting, or data transformation
7. **Security**: Keeps API tokens server-side, never exposed to client

## Security Considerations

### Cookie Security Flags

- **HttpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Only transmitted over HTTPS
- **SameSite**: Controls cross-site request behavior

### Token Validation

Cloudflare Access validates tokens on every request:
1. Checks token signature
2. Verifies token hasn't expired
3. Confirms token is for the correct application
4. Validates user still has access per policy

### No Double Authentication

The architecture avoids double authentication by:
- Using domain-wide cookie (`.0security.net`)
- Leveraging `Cf-Access-Jwt-Assertion` header
- Worker forwarding existing credentials
- Not requiring separate Access policy on `/cf-access`

## Troubleshooting

### Cookie Not Being Sent

**Symptom**: 401 errors, "no app token set"

**Causes**:
1. Cookie domain mismatch (e.g., set for `openwebui.0security.net` instead of `.0security.net`)
2. Cookie expired
3. User not authenticated on any protected route
4. Secure flag set but accessing via HTTP

**Solution**: Check cookie domain in Access application settings

### JWT Assertion Missing

**Symptom**: Worker receives no `Cf-Access-Jwt-Assertion` header

**Causes**:
1. Route not behind Cloudflare Access
2. Access not properly configured
3. Request bypassing Cloudflare (direct to origin)

**Solution**: Ensure Cloudflare Access is protecting the route

### Identity Fetch Returns 400

**Symptom**: "no app token set" error from identity endpoint

**Causes**:
1. Cookie not forwarded in worker fetch
2. Wrong endpoint URL
3. Invalid token format

**Solution**: Ensure worker forwards both Cookie and JWT headers

## Configuration Checklist

- [ ] Cloudflare Access application configured for domain
- [ ] Cookie domain set to `.0security.net` (wildcard)
- [ ] Access policy allows intended users
- [ ] Worker routes configured in `wrangler.jsonc`
- [ ] Worker deployed to Cloudflare
- [ ] DNS points to Cloudflare (orange cloud)
- [ ] SSL/TLS enabled (Full or Full Strict)

## Related Files

- `/src/worker-template.js` - Worker routing and identity proxy
- `/src/pages/cf-access/index.html` - Main page UI
- `/src/pages/cf-access/scripts/warpinfo.js` - WARP info fetching
- `/src/pages/cf-access/scripts/deviceinfo.js` - Device info fetching
- `/wrangler.jsonc` - Worker configuration
- `/src/build.js` - Build script to bundle worker

## References

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/)
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [Access JWT Validation](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)
