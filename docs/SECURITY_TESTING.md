# Security Testing Guide

This document outlines security measures and penetration testing approaches for Angular Momentum.

## Security Headers

The application sets the following security headers on all responses:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevents MIME type sniffing |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-XSS-Protection | 0 | Disabled (CSP is preferred) |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer information |
| Permissions-Policy | camera=(), microphone=(), etc. | Restricts browser features |
| Strict-Transport-Security | max-age=31536000 | HSTS (production only) |

Content Security Policy (CSP) is defined in the Angular `index.html` meta tag to allow Angular's inline styles.

### Verifying Headers

Test security headers using:
- [securityheaders.com](https://securityheaders.com) - Scan your production URL
- Browser DevTools → Network tab → Response Headers
- Command line: `curl -I https://your-domain.com`

## Manual Penetration Testing Checklist

### Authentication & Session Management

- [ ] **Brute force protection**: Rate limiting is enabled (100 requests/10 min)
- [ ] **Session fixation**: Verify tokens are regenerated on login
- [ ] **Password policy**: 8+ chars with complexity OR 20+ chars
- [ ] **Account enumeration**: Login errors don't reveal if user exists
- [ ] **Session timeout**: Check idle session expiration
- [ ] **CSRF protection**: Verify anti-CSRF tokens on state-changing requests

### Input Validation

- [ ] **SQL injection**: Test user inputs with `' OR 1=1 --`
- [ ] **XSS (reflected)**: Test inputs with `<script>alert('XSS')</script>`
- [ ] **XSS (stored)**: Check if persistent data is properly escaped
- [ ] **Command injection**: Test inputs with `; ls -la`
- [ ] **Path traversal**: Test file paths with `../../../etc/passwd`
- [ ] **Email validation**: Test malformed emails in registration

### API Security

- [ ] **Authorization**: Access resources without authentication
- [ ] **IDOR**: Access other users' data by changing IDs
- [ ] **Rate limiting**: Verify API endpoints are rate-limited
- [ ] **Input size limits**: Send oversized payloads
- [ ] **Content-Type validation**: Send wrong content types
- [ ] **GraphQL introspection**: Check if schema is exposed (should be in dev only)

### Client-Side Security

- [ ] **Sensitive data exposure**: Check localStorage/sessionStorage for secrets
- [ ] **Source map exposure**: Ensure production builds don't expose source maps
- [ ] **Debug info leakage**: Check console for sensitive logs
- [ ] **Dependency vulnerabilities**: Run `npm audit`

### Infrastructure

- [ ] **HTTPS enforcement**: Verify HTTP redirects to HTTPS
- [ ] **Cookie security**: Check `Secure`, `HttpOnly`, `SameSite` flags
- [ ] **CORS policy**: Verify only allowed origins can make requests
- [ ] **Error handling**: Ensure errors don't leak stack traces

## Automated Testing Tools

### Dependency Scanning
```bash
# Check for known vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix
```

### Static Analysis
```bash
# ESLint security rules (already configured)
npm run lint
```

### OWASP ZAP (Optional)
For deeper penetration testing:
1. Install [OWASP ZAP](https://www.zaproxy.org/)
2. Run in proxy mode
3. Browse the application
4. Run active scan

## Incident Response

If a security vulnerability is discovered:
1. Document the issue with reproduction steps
2. Assess severity (Critical/High/Medium/Low)
3. Create a fix in a private branch
4. Test the fix thoroughly
5. Deploy and monitor

## Security Contact

Report security vulnerabilities to: security@angularmomentum.app
