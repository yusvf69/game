import { Request, Response, NextFunction } from "express";
import { db, rolesTable, permissionsTable, rolePermissionsTable, usersTable, sessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string | null;
        role: string;
        permissions: string[];
      };
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
    if (!session || session.expiresAt < new Date()) {
      req.user = undefined;
      next();
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) {
      req.user = undefined;
      next();
      return;
    }

    const role = (user as any).role || "player";

    const perms = await db.select({ key: permissionsTable.key })
      .from(rolePermissionsTable)
      .innerJoin(rolesTable, eq(rolePermissionsTable.roleId, rolesTable.id))
      .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
      .where(eq(rolesTable.name, role));

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role,
      permissions: perms.map(p => p.key),
    };
  } catch {
    req.user = undefined;
  }
  next();
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const hasAll = permissions.every(p => req.user!.permissions.includes(p));
    if (!hasAll) {
      res.status(403).json({ error: "Forbidden", required: permissions });
      return;
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", requiredRole: roles });
      return;
    }
    next();
  };
}
