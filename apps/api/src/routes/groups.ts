import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Group } from '../models/Group';

const router = Router();

// Create a group
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, isPublic } = req.body;
    
    // Generate a unique 4-digit code
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const existing = await Group.findOne({ code });
      if (!existing) isUnique = true;
    }

    const group = await Group.create({
      name,
      code,
      isPublic: isPublic || false,
      adminId: req.user?._id,
      members: [req.user?._id]
    });

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
});

// Join group via Code
router.post('/join', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    const group = await Group.findOne({ code });
    
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    if (!group.members.includes(req.user?._id as any)) {
      group.members.push(req.user?._id as any);
      await group.save();
    }

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to join group' });
  }
});

// Get user's groups
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groups = await Group.find({ members: req.user?._id });
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

export default router;
