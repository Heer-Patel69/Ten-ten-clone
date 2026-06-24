import { Router, Response } from 'express';
import { Friendship } from '../models/Friendship';
import { User } from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const MAX_FRIENDS = 10;
const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/friends — List accepted friends
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    })
      .populate('requester', 'userCode displayName isOnline lastSeen')
      .populate('recipient', 'userCode displayName isOnline lastSeen');

    const friends = friendships.map((f) => {
      const friend =
        f.requester._id.toString() === userId.toString()
          ? f.recipient
          : f.requester;
      return {
        friendshipId: f._id,
        friend,
      };
    });

    res.json({ success: true, data: { friends, count: friends.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch friends' });
  }
});

// GET /api/friends/requests — Pending incoming requests
router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user!._id,
      status: 'pending',
    }).populate('requester', 'userCode displayName');

    res.json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// GET /api/friends/sent — Pending outgoing requests
router.get('/sent', async (req: AuthRequest, res: Response) => {
  try {
    const requests = await Friendship.find({
      requester: req.user!._id,
      status: 'pending',
    }).populate('recipient', 'userCode displayName');

    res.json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch sent requests' });
  }
});

// POST /api/friends/request — Send friend request by 4-digit code
router.post('/request', async (req: AuthRequest, res: Response) => {
  try {
    const { userCode } = req.body;
    const userId = req.user!._id;

    if (!userCode || !/^\d{4}$/.test(userCode)) {
      res.status(400).json({ success: false, error: 'Valid 4-digit code required' });
      return;
    }

    // Can't add yourself
    if (userCode === req.user!.userCode) {
      res.status(400).json({ success: false, error: "You can't add yourself" });
      return;
    }

    // Find the target user
    const targetUser = await User.findOne({ userCode });
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'No user found with that code' });
      return;
    }

    // Check friend limit for both users
    const myFriendCount = await Friendship.countDocuments({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    });

    if (myFriendCount >= MAX_FRIENDS) {
      res
        .status(400)
        .json({ success: false, error: `You already have ${MAX_FRIENDS} friends (max limit)` });
      return;
    }

    const theirFriendCount = await Friendship.countDocuments({
      $or: [{ requester: targetUser._id }, { recipient: targetUser._id }],
      status: 'accepted',
    });

    if (theirFriendCount >= MAX_FRIENDS) {
      res
        .status(400)
        .json({ success: false, error: 'This user has reached their friend limit' });
      return;
    }

    // Check if relationship already exists
    const existing = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: targetUser._id },
        { requester: targetUser._id, recipient: userId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        res.status(400).json({ success: false, error: 'Already friends' });
        return;
      }
      if (existing.status === 'pending') {
        res.status(400).json({ success: false, error: 'Friend request already pending' });
        return;
      }
      if (existing.status === 'blocked') {
        res.status(400).json({ success: false, error: 'Unable to send request' });
        return;
      }
    }

    const friendship = new Friendship({
      requester: userId,
      recipient: targetUser._id,
    });

    await friendship.save();
    await friendship.populate('recipient', 'userCode displayName');

    res.status(201).json({ success: true, data: { friendship } });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: 'Request already exists' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to send request' });
  }
});

// PUT /api/friends/accept/:friendshipId
router.put('/accept/:friendshipId', async (req: AuthRequest, res: Response) => {
  try {
    const friendship = await Friendship.findOne({
      _id: req.params.friendshipId,
      recipient: req.user!._id,
      status: 'pending',
    });

    if (!friendship) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }

    // Re-check friend limit before accepting
    const friendCount = await Friendship.countDocuments({
      $or: [{ requester: req.user!._id }, { recipient: req.user!._id }],
      status: 'accepted',
    });

    if (friendCount >= MAX_FRIENDS) {
      res
        .status(400)
        .json({ success: false, error: `You already have ${MAX_FRIENDS} friends (max limit)` });
      return;
    }

    friendship.status = 'accepted';
    await friendship.save();

    await friendship.populate('requester', 'userCode displayName isOnline lastSeen');
    await friendship.populate('recipient', 'userCode displayName isOnline lastSeen');

    res.json({ success: true, data: { friendship } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to accept request' });
  }
});

// PUT /api/friends/reject/:friendshipId
router.put('/reject/:friendshipId', async (req: AuthRequest, res: Response) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      _id: req.params.friendshipId,
      recipient: req.user!._id,
      status: 'pending',
    });

    if (!friendship) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }

    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
});

// DELETE /api/friends/:friendshipId — Remove friend
router.delete('/:friendshipId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const friendship = await Friendship.findOneAndDelete({
      _id: req.params.friendshipId,
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    });

    if (!friendship) {
      res.status(404).json({ success: false, error: 'Friendship not found' });
      return;
    }

    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove friend' });
  }
});

export default router;
