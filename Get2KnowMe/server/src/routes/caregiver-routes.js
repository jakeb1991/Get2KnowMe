import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { authenticateToken } from '../utils/auth.js';

const router = express.Router();

// Generate a delegate invite token (the person being cared for creates this)
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const { permissions = 'view' } = req.body;
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    currentUser.delegateInvites.push({ token, permissions, expiresAt });
    await currentUser.save();

    res.json({ token, expiresAt, permissions });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

// Accept a delegate invite (the caregiver enters the token)
router.post('/accept/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;

    const ownerUser = await User.findOne({
      'delegateInvites.token': token,
      'delegateInvites.expiresAt': { $gt: new Date() }
    });

    if (!ownerUser) {
      return res.status(404).json({ error: 'Invalid or expired invite token' });
    }

    if (ownerUser._id.equals(req.user._id)) {
      return res.status(400).json({ error: 'Cannot accept your own invite' });
    }

    const invite = ownerUser.delegateInvites.find(i => i.token === token && i.expiresAt > new Date());
    const permissions = invite.permissions;

    ownerUser.delegateInvites = ownerUser.delegateInvites.filter(i => i.token !== token);

    if (!ownerUser.delegates.some(d => d.user.equals(req.user._id))) {
      ownerUser.delegates.push({ user: req.user._id, permissions });
    }
    await ownerUser.save();

    const caregiver = await User.findById(req.user._id);
    if (!caregiver.managedBy.some(m => m.user.equals(ownerUser._id))) {
      caregiver.managedBy.push({ user: ownerUser._id, permissions });
    }
    await caregiver.save();

    res.json({
      message: 'Delegate access granted',
      owner: { _id: ownerUser._id, username: ownerUser.username },
      permissions
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// List delegates for the current user (people who can access MY passport)
router.get('/delegates', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('delegates.user', 'username email')
      .select('delegates delegateInvites');

    res.json({
      delegates: user.delegates.map(d => ({
        _id: d.user._id,
        username: d.user.username,
        email: d.user.email,
        permissions: d.permissions,
        addedAt: d.addedAt
      })),
      pendingInvites: user.delegateInvites
        .filter(i => i.expiresAt > new Date())
        .map(i => ({ token: i.token, permissions: i.permissions, expiresAt: i.expiresAt }))
    });
  } catch (error) {
    console.error('List delegates error:', error);
    res.status(500).json({ error: 'Failed to list delegates' });
  }
});

// List profiles I can manage (profiles I have been granted access to)
router.get('/managed', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('managedBy.user', 'username email communicationPassport.preferredName communicationPassport.firstName communicationPassport.profilePasscode communicationPassport.profilePhoto')
      .select('managedBy');

    res.json({
      managedProfiles: user.managedBy.map(m => ({
        _id: m.user._id,
        username: m.user.username,
        displayName: m.user.communicationPassport?.preferredName || m.user.communicationPassport?.firstName || m.user.username,
        passcode: m.user.communicationPassport?.profilePasscode,
        profilePhoto: m.user.communicationPassport?.profilePhoto,
        permissions: m.permissions,
        addedAt: m.addedAt
      }))
    });
  } catch (error) {
    console.error('List managed profiles error:', error);
    res.status(500).json({ error: 'Failed to list managed profiles' });
  }
});

// Remove a delegate (the person being cared for removes caregiver access)
router.delete('/delegate/:userId', authenticateToken, async (req, res) => {
  try {
    const delegateId = req.params.userId;
    const user = await User.findById(req.user._id);

    const delegateIndex = user.delegates.findIndex(d => d.user.equals(delegateId));
    if (delegateIndex === -1) {
      return res.status(404).json({ error: 'Delegate not found' });
    }

    user.delegates.splice(delegateIndex, 1);
    await user.save();

    const delegateUser = await User.findById(delegateId);
    if (delegateUser) {
      const managedIndex = delegateUser.managedBy.findIndex(m => m.user.equals(req.user._id));
      if (managedIndex !== -1) {
        delegateUser.managedBy.splice(managedIndex, 1);
        await delegateUser.save();
      }
    }

    res.json({ message: 'Delegate removed' });
  } catch (error) {
    console.error('Remove delegate error:', error);
    res.status(500).json({ error: 'Failed to remove delegate' });
  }
});

// Revoke my own managed access (caregiver removes themselves)
router.delete('/managed/:userId', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.params.userId;
    const caregiver = await User.findById(req.user._id);

    const managedIndex = caregiver.managedBy.findIndex(m => m.user.equals(ownerId));
    if (managedIndex === -1) {
      return res.status(404).json({ error: 'Managed profile not found' });
    }

    caregiver.managedBy.splice(managedIndex, 1);
    await caregiver.save();

    const ownerUser = await User.findById(ownerId);
    if (ownerUser) {
      const delegateIndex = ownerUser.delegates.findIndex(d => d.user.equals(req.user._id));
      if (delegateIndex !== -1) {
        ownerUser.delegates.splice(delegateIndex, 1);
        await ownerUser.save();
      }
    }

    res.json({ message: 'Managed access revoked' });
  } catch (error) {
    console.error('Revoke managed access error:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

export default router;
