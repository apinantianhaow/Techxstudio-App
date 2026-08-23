import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

/**
 * Sign a JWT token with a 7-day expiry
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract authenticated user from request Authorization header
 * Returns { id, email, full_name } or null
 */
export function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  return decoded;
}
