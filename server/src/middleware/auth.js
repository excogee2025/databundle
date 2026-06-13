import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { hasPermission, isAdmin, ROLES } from '../config/roles.js';
import { isTokenBlacklisted } from '../lib/redis.js';

export function signToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  return { token, jti };
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const decoded = verifyToken(token);

    if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: 'Authentication required' });

    const allowed = permissions.some((p) => hasPermission(role, p));
    if (!allowed) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied for your role' });
    }
    next();
  };
}

export function adminMiddleware(req, res, next) {
  if (!isAdmin(req.user?.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireSelfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    const targetId = req.params[paramName];
    if (req.user?.role === ROLES.ADMIN || req.user?.id === targetId) {
      return next();
    }
    return res.status(403).json({ error: 'Access denied' });
  };
}

export { ROLES };
