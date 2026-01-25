import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../config/database.js';
import { User, UserPayload } from '../types/index.js';
import { validateRequest, loginSchema } from '../middleware/validation.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    // Generate JWT
    const payload: UserPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      nama_lengkap: user.nama_lengkap
    };

    const secret = process.env.JWT_SECRET || 'dev-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: payload,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak terautentikasi'
      });
    }

    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan'
    });
  }
});

// Logout (client-side only, just return success)
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout berhasil'
  });
});

export default router;
