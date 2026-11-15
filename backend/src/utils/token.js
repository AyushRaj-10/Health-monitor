import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * Generates short-lived JWT Access Token (15 mins)
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwtAccessSecret,
    {
      expiresIn: config.jwtAccessExpiry,
      issuer: 'iomt-rpm-auth',
      audience: 'iomt-rpm-client',
    }
  );
}

/**
 * Generates opaque cryptographically random Refresh Token string
 */
export function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Computes SHA-256 hash of token to prevent plaintext token storage in DB
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Sets secure, HttpOnly, SameSite cookie for Refresh Token
 */
export function setRefreshTokenCookie(res, refreshToken) {
  const isProduction = config.nodeEnv === 'production';
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // Prevents XSS theft
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    path: '/api/auth', // Restricted path
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
}

/**
 * Clears Refresh Token cookie on logout
 */
export function clearRefreshTokenCookie(res) {
  const isProduction = config.nodeEnv === 'production';
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
  });
}
