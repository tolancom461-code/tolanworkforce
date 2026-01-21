import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Helper function to check if user is the owner
function isOwner(user: any): boolean {
  if (!user || !user.openId) return false;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  return user.openId === ownerOpenId;
}

// Helper function to check if user has a specific permission
export function hasPermission(user: any, permissionCode: string): boolean {
  if (!user || !user.permissions) return false;
  
  // Owner has all permissions automatically
  if (isOwner(user)) return true;
  
  return user.permissions.some((p: any) => p.code === permissionCode);
}

// Middleware to require a specific permission
export function requirePermission(permissionCode: string) {
  return t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Owner bypasses all permission checks
    if (isOwner(ctx.user)) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    }

    if (!hasPermission(ctx.user, permissionCode)) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: `ليس لديك صلاحية ${permissionCode}` 
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });
}
