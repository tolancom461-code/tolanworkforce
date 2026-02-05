import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getUserByUsername } from "./db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * Authentication Router
 *
 * Handles local authentication using username/password with JWT tokens.
 * Tokens are stored in sessionStorage on the frontend and sent via Authorization header.
 * Backend validates Bearer tokens in the Authorization header.
 */
export const appRouter = router({
  // System router for internal operations
  system: systemRouter,

  // Authentication router - handles login/logout and user info
  auth: router({
    /**
     * Get current authenticated user
     * Returns null if not authenticated
     */
    me: publicProcedure.query(opts => opts.ctx.user),

    /**
     * Logout - clears session cookie
     */
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /**
     * Local authentication with username and password
     *
     * Flow:
     * 1. Validate username and password
     * 2. Hash password with bcrypt and compare
     * 3. Generate JWT token with user info (id, username, role)
     * 4. Return token to frontend
     * 5. Frontend stores token in sessionStorage and sends via Authorization header
     *
     * Token format: Bearer <jwt_token>
     * Expiration: 15 minutes
     */
    localLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Find user by username
        const user = await getUserByUsername(input.username);

        if (!user || !user.passwordHash) {
          throw new Error("Invalid username or password");
        }

        // Verify password using bcryptjs
        const passwordMatch = await bcryptjs.compare(input.password, user.passwordHash);
        if (!passwordMatch) {
          throw new Error("Invalid username or password");
        }

        // Generate JWT token with user claims
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role,
          },
          process.env.JWT_SECRET || "secret",
          { expiresIn: "15m" }
        );

        // Set session cookie (for backward compatibility with OAuth flow)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        // Return token and user info
        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
          },
          accessToken: token,
        };
      }),
  }),

  // TODO: Add feature routers here as your app grows
  // Example:
  // employees: router({
  //   list: protectedProcedure.query(({ ctx }) => db.getEmployees()),
  //   create: protectedProcedure.input(...).mutation(...),
  // }),
});

export type AppRouter = typeof appRouter;
