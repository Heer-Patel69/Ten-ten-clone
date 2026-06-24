import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Group } from '../models/Group';

const router = Router();

// Search for public groups
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    let filter: any = { isPublic: true };

    if (query) {
      filter.name = { $regex: query, $options: 'i' };
    }

    // Return top 50 public groups
    const groups = await Group.find(filter)
      .limit(50)
      .populate('adminId', 'displayName')
      .lean();

    // Attach member count for UI
    const groupsWithCount = groups.map(g => ({
      ...g,
      memberCount: g.members.length
    }));

    res.json({ success: true, data: groupsWithCount });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch explore page' });
  }
});

export default router;
