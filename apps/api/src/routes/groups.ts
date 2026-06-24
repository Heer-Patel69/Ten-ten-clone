import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Group } from '../models/Group';
import crypto from 'crypto';

const router = Router();

// Create a group
router.post('/create', requireAuth, async (req, res) => {
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
      adminId: req.userId,
      members: [req.userId]
    });

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
});

// Join group via Code
router.post('/join', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const group = await Group.findOne({ code });
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    if (!group.members.includes(req.userId as any)) {
      group.members.push(req.userId as any);
      await group.save();
    }

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to join group' });
  }
});

// Get user's groups
router.get('/', requireAuth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId });
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

export default router;
