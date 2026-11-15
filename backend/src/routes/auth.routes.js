import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  refreshToken,
  logout,
  getCurrentUser,
  registerDoctor,
} from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';

export const authRouter = Router();

// Strict rate limiter for login to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    },
  },
});

// Authentication endpoints
authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh-token', authLimiter, refreshToken);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticateToken, getCurrentUser);

// Privileged User Management (ADMIN only)
authRouter.post(
  '/register-doctor',
  authenticateToken,
  requireRole('ADMIN'),
  registerDoctor
);

// Helper endpoint for populating Assigned Doctor dropdowns (accessible to all authenticated staff)
authRouter.get('/doctors', authenticateToken, async (req, res, next) => {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: { in: ['DOCTOR', 'ADMIN'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
});
