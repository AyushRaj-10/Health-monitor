import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/token.js';
import { loginSchema, registerDoctorSchema } from '../validations/auth.validation.js';
import { recordAuditLog } from '../services/audit.service.js';

/**
 * POST /api/auth/login
 * Public endpoint to authenticate users and generate access/refresh tokens
 */
export async function login(req, res, next) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input credentials',
          details: parseResult.error.errors,
        },
      });
    }

    const { email, password } = parseResult.data;

    // Find user by normalized email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Timing-safe password check (avoid leaking user existence)
    if (!user) {
      // Fake hash compare to prevent timing side-channel attack
      await bcrypt.compare(password, '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF0123456789ABCDEFGHIJK');
      recordAuditLog({
        action: 'AUTH_FAILED_LOGIN',
        resourceType: 'User',
        metadata: { attemptedEmail: email, reason: 'USER_NOT_FOUND' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: 'AUTH_FAILED_LOGIN',
        resourceType: 'User',
        resourceId: user.id,
        metadata: { reason: 'PASSWORD_MISMATCH' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'This clinician account has been suspended or deactivated. Contact your hospital system administrator.',
        },
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenString = generateRefreshTokenString();
    const tokenHash = hashToken(refreshTokenString);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Persist refresh token session in database
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Set secure HttpOnly cookie
    setRefreshTokenCookie(res, refreshTokenString);

    // Audit Log Entry for Successful Authentication
    recordAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'AUTH_LOGIN',
      resourceType: 'User',
      resourceId: user.id,
      metadata: { department: user.department, role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
    });

    // Return access token and sanitized user
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh-token
 * Reissues a short-lived access token using valid HttpOnly refresh token cookie
 */
export async function refreshToken(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token session not provided in request.',
        },
      });
    }

    const tokenHash = hashToken(rawRefreshToken);

    // Find token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      clearRefreshTokenCookie(res);

    if (req.user) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'AUTH_LOGOUT',
        resourceType: 'User',
        resourceId: req.user.id,
        ipAddress: req.ip,
        status: 'SUCCESS',
      });
    }
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Session is expired or has been revoked. Please sign in again.',
        },
      });
    }

    if (!tokenRecord.user.isActive) {
      clearRefreshTokenCookie(res);

    if (req.user) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'AUTH_LOGOUT',
        resourceType: 'User',
        resourceId: req.user.id,
        ipAddress: req.ip,
        status: 'SUCCESS',
      });
    }
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'User account is inactive.',
        },
      });
    }

    // Refresh Token Rotation: revoke current, issue new
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshTokenString = generateRefreshTokenString();
    const newTokenHash = hashToken(newRefreshTokenString);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: tokenRecord.userId,
        expiresAt: newExpiresAt,
      },
    });

    const newAccessToken = generateAccessToken(tokenRecord.user);
    setRefreshTokenCookie(res, newRefreshTokenString);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: {
          id: tokenRecord.user.id,
          name: tokenRecord.user.name,
          email: tokenRecord.user.email,
          role: tokenRecord.user.role,
          department: tokenRecord.user.department,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Revokes refresh token in database and clears HttpOnly cookie
 */
export async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    clearRefreshTokenCookie(res);

    if (req.user) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'AUTH_LOGOUT',
        resourceType: 'User',
        resourceId: req.user.id,
        ipAddress: req.ip,
        status: 'SUCCESS',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile
 */
export async function getCurrentUser(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/register-doctor
 * Restricted to ADMIN role only. Registers new doctor or staff clinician.
 */
export async function registerDoctor(req, res, next) {
  try {
    const parseResult = registerDoctorSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input data',
          details: parseResult.error.errors,
        },
      });
    }

    const { name, email, password, role, department } = parseResult.data;

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'A clinician or user with this email address already exists.',
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        department: department || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `New ${role} registered successfully.`,
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    next(error);
  }
}
