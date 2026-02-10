# Security Audit Notes - Findings

## CRITICAL VULNERABILITIES

### 1. users.update - NO AUTHORIZATION CHECK (CRITICAL)
- File: server/routers.ts line 174-199
- ANY authenticated user can update ANY other user's data including password
- No role check, no ownership check
- Attacker: any logged-in user can change admin's password

### 2. users.delete - NO AUTHORIZATION CHECK (CRITICAL)
- File: server/routers.ts line 201-206
- ANY authenticated user can delete ANY user
- No role check at all

### 3. adminProcedure is BROKEN (CRITICAL)
- File: server/_core/trpc.ts line 30-45
- adminProcedure does NOT check admin role - it's identical to protectedProcedure
- Comment says "All users are now treated as Admin with full access"
- hasPermission() always returns true
- requirePermission() does nothing

### 4. Fallback JWT Secret (HIGH)
- File: server/routers.ts line 77, server/_core/sdk.ts line 211
- Uses `process.env.JWT_SECRET || 'fallback-secret'`
- If JWT_SECRET not set, anyone can forge tokens with known secret

### 5. Rate Limiting NOT APPLIED (HIGH)
- security.ts defines rate limiters but they are NEVER used in index.ts or routers.ts
- No middleware applies them to any endpoint
- DDoS protection exists only on paper

### 6. CSRF Protection NOT APPLIED (HIGH)
- CSRFTokenManager exists in security.ts but is never used
- No CSRF middleware in index.ts
- State-changing mutations have no CSRF protection

### 7. Security Headers NOT APPLIED (HIGH)
- getSecurityHeaders() exists but is never called in index.ts
- No CSP, no X-Frame-Options, no HSTS applied

### 8. Cookie sameSite: "none" (MEDIUM)
- File: server/_core/cookies.ts line 45
- sameSite: "none" allows cross-site cookie sending
- Combined with no CSRF protection = CSRF attacks possible

### 9. Input Sanitization NOT APPLIED (MEDIUM)
- sanitizeInput/sanitizeObject exist but are never called
- User inputs go directly to DB queries

### 10. Session Token Expiry: 1 YEAR (MEDIUM)
- File: server/_core/sdk.ts line 187
- ONE_YEAR_MS expiry for OAuth sessions
- Stolen tokens valid for a year

### 11. users.list - Exposes ALL Users (MEDIUM)
- Any authenticated user can list all users
- No role-based filtering

### 12. No Audit Logging (MEDIUM)
- No logging of who did what when
- Critical operations (delete, approve, reject) leave no trace

### 13. Body Size 50MB (LOW)
- File: server/_core/index.ts line 37
- 50MB body limit is excessive for a payroll app
- Could be used for memory exhaustion

### 14. Encryption at Rest NOT USED (MEDIUM)
- Encryptor class exists but is never instantiated
- Sensitive data (salaries, national IDs) stored in plaintext

## IDOR VULNERABILITIES CONFIRMED
- workers.getById: NO cost center check - any user sees any worker
- groups.delete: NO role check - any authenticated user can delete groups
- workers.delete: NO role check - any authenticated user can delete workers
- costCenters.delete: NO role check - any authenticated user can delete cost centers
- groups.create/update: NO role check
- workers.create/update: NO role check
- costCenters.create/update: NO role check
- attendance.record: NO role check - any user can record attendance
- dailyFinance mutations: NO role check
- schedules mutations: NO role check
- importExport mutations: NO role check

## SESSION ISSUES
- Session token valid for 1 YEAR (ONE_YEAR_MS)
- sameSite: "none" on cookies
- No session revocation mechanism
- No concurrent session limit

## ADDITIONAL FINDINGS
- 29 mutations without ctx (no role/ownership check)
- adminProcedure is identical to protectedProcedure (broken)
- hasPermission() always returns true
- requirePermission() does nothing
- Body size limit 50MB (memory exhaustion risk)
- No audit logging for any operation
- Sensitive data (nationalId, salaries) stored in plaintext
- SQL uses Drizzle ORM parameterized queries (safe from SQL injection)
- But some raw sql`` templates could be risky if user input reaches them
