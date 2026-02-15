import "dotenv/config";
// Set timezone to Saudi Arabia (UTC+3)
process.env.TZ = 'Asia/Riyadh';

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getSecurityHeaders, apiRateLimiter, loginRateLimiter, csrfManager } from "./security";
import { parse as parseCookieHeader } from "cookie";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ==========================================
  // SECURITY MIDDLEWARE
  // ==========================================

  // 1. Security Headers (CSP, HSTS, X-Frame-Options, etc.)
  app.use((req, res, next) => {
    const headers = getSecurityHeaders();
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    next();
  });

  // 2. Rate Limiting for API endpoints
  app.use("/api/trpc", (req, res, next) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Stricter rate limit for auth-related endpoints
    const isAuthEndpoint = req.url?.includes('auth.localLogin') || req.url?.includes('auth.logout');
    const limiter = isAuthEndpoint ? loginRateLimiter : apiRateLimiter;
    
    if (!limiter.isAllowed(clientIP)) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.',
        retryAfter: isAuthEndpoint ? 900 : 60,
      });
      return;
    }
    next();
  });

  // 3. Body size limits - reduced from 50MB to 10MB (still allows Excel imports)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // ==========================================
  // CSRF TOKEN ENDPOINT
  // ==========================================
  app.get("/api/csrf-token", (req, res) => {
    const { combined } = csrfManager.generateToken();
    
    // Set CSRF cookie (NOT httpOnly - frontend needs to read it)
    // sameSite: "lax" prevents cross-origin sending
    const isSecure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(csrfManager.cookieName, combined, {
      httpOnly: false, // Frontend must read this
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600000, // 1 hour
    });
    
    res.json({ token: combined });
  });

  // ==========================================
  // CSRF VALIDATION MIDDLEWARE (mutations only)
  // ==========================================
  app.use("/api/trpc", (req, res, next) => {
    // Only validate on POST requests (mutations)
    // GET requests (queries) don't need CSRF protection
    if (req.method !== 'POST') {
      return next();
    }
    
    // Skip CSRF check for auth endpoints (login/logout/callback)
    // These are either the first request or use different auth flow
    const url = req.url || '';
    if (url.includes('auth.localLogin') || url.includes('auth.logout') || url.includes('auth.me')) {
      return next();
    }
    
    // Get token from cookie and header
    const cookies = parseCookieHeader(req.headers.cookie || '');
    const cookieToken = cookies[csrfManager.cookieName];
    const headerToken = req.headers[csrfManager.headerName] as string | undefined;
    
    if (!csrfManager.validateToken(cookieToken, headerToken)) {
      res.status(403).json({
        error: 'CSRF_VALIDATION_FAILED',
        message: 'رمز الحماية غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      });
      return;
    }
    
    next();
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Auto-run migration for flexible schedule feature
    try {
      const { runMigration } = await import('../db');
      await runMigration();
      console.log('[Migration] Successfully added flexible schedule columns');
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log('[Migration] Columns already exist, skipping migration');
      } else {
        console.error('[Migration] Failed:', error.message);
      }
    }
  });
}

startServer().catch(console.error);
