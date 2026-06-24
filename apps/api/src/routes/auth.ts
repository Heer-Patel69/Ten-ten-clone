import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, generateUniqueCode } from '../models/User';
import { config } from '../config/env';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: '1h',
  });
  const refreshToken = jwt.sign({ userId }, config.jwtRefreshSecret, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { displayName, password } = req.body;

    if (!displayName || !password) {
      res
        .status(400)
        .json({ success: false, error: 'Display name and password are required' });
      return;
    }

    if (password.length < 6) {
      res
        .status(400)
        .json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    if (displayName.length > 30) {
      res
        .status(400)
        .json({ success: false, error: 'Display name must be under 30 characters' });
      return;
    }

    const userCode = await generateUniqueCode();

    const user = new User({
      userCode,
      displayName: displayName.trim(),
      password,
    });

    await user.save();

    const tokens = generateTokens(user._id.toString());

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        userCode,
        ...tokens,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { userCode, password } = req.body;

    if (!userCode || !password) {
      res
        .status(400)
        .json({ success: false, error: 'User code and password are required' });
      return;
    }

    const user = await User.findOne({ userCode });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid code or password' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid code or password' });
      return;
    }

    const tokens = generateTokens(user._id.toString());

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        ...tokens,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
      userId: string;
    };
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const tokens = generateTokens(user._id.toString());
    res.json({ success: true, data: tokens });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { user: req.user!.toJSON() } });
});

// PUT /api/auth/profile
router.put(
  '/profile',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { displayName } = req.body;
      if (displayName) {
        req.user!.displayName = displayName.trim();
      }
      await req.user!.save();
      res.json({ success: true, data: { user: req.user!.toJSON() } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Update failed' });
    }
  }
);

// PUT /api/auth/push-subscription
router.put(
  '/push-subscription',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      req.user!.pushSubscription = req.body.subscription;
      await req.user!.save();
      res.json({ success: true, message: 'Push subscription saved' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to save subscription' });
    }
  }
);

export default router;
