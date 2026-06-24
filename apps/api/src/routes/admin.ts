import { Router, Response } from 'express';
import { User } from '../models/User';
import { Friendship } from '../models/Friendship';
import { Report } from '../models/Report';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, onlineUsers, todayUsers, totalFriendships, pendingReports] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isOnline: true }),
        User.countDocuments({ createdAt: { $gte: today } }),
        Friendship.countDocuments({ status: 'accepted' }),
        Report.countDocuments({ status: 'pending' }),
      ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        onlineUsers,
        todayUsers,
        totalFriendships,
        pendingReports,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { userCode: search },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// DELETE /api/admin/users/:id — Ban/delete user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Don't allow self-deletion
    if (req.params.id === req.user!._id.toString()) {
      res.status(400).json({ success: false, error: "Can't delete yourself" });
      return;
    }

    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Friendship.deleteMany({
        $or: [{ requester: req.params.id }, { recipient: req.params.id }],
      }),
    ]);

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// GET /api/admin/reports
router.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string;
    const query: any = {};
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('reporter', 'userCode displayName')
      .populate('reportedUser', 'userCode displayName')
      .populate('resolvedBy', 'displayName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { reports } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

// PUT /api/admin/reports/:id
router.put('/reports/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, resolution } = req.body;

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolution,
        resolvedBy: req.user!._id,
      },
      { new: true }
    )
      .populate('reporter', 'userCode displayName')
      .populate('reportedUser', 'userCode displayName');

    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    res.json({ success: true, data: { report } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update report' });
  }
});

export default router;
