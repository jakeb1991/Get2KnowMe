// server/src/routes/passport-routes.js
import express from 'express';
import { validatePassportData } from '../middleware/passportValidator.js';
import { normalizePhoneNumber } from '../utils/phoneNormalization.js';
import User from '../models/User.js';
import { generateFriendlyPasscode } from '../utils/passcodeGenerator.js';
import { authenticateToken } from '../utils/auth.js';
import { passportUpdateMiddleware } from '../middleware/passportTracking.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = express.Router();

// Freetext string fields that are encrypted at rest.
// Arrays (diagnoses, healthAlert, communicationPreferences) and the passcode
// are left as plaintext — arrays are enum values defined in code, and the
// passcode is a public shareable identifier used for DB lookups.
const ENCRYPTED_STRING_FIELDS = [
  'firstName', 'lastName', 'preferredName', 'customPronouns',
  'customDiagnosis', 'customHealthAlert', 'allergyList', 'customPreferences',
  'triggers', 'likes', 'dislikes', 'otherInformation',
  'communicationMethod', 'avoidWords', 'medications', 'calmingStrategies',
  'distressSigns', 'sensoryNeeds'
];

const PLAIN_FIELDS = [
  'preferredPronouns', 'diagnoses', 'healthAlert', 'communicationPreferences'
];

function encryptPassportForSave(passportData, cleanPasscode) {
  const dotUpdate = {};

  for (const field of ENCRYPTED_STRING_FIELDS) {
    if (field in passportData) {
      dotUpdate[`communicationPassport.${field}`] = encrypt(passportData[field]);
    }
  }

  for (const field of PLAIN_FIELDS) {
    if (field in passportData) {
      dotUpdate[`communicationPassport.${field}`] = passportData[field];
    }
  }

  // Encrypt sensitive trusted contact sub-fields individually
  if (passportData.trustedContact) {
    dotUpdate['communicationPassport.trustedContact'] = {
      countryCode: passportData.trustedContact.countryCode,
      name: encrypt(passportData.trustedContact.name),
      phone: encrypt(passportData.trustedContact.phone),
      email: encrypt(passportData.trustedContact.email || ''),
    };
  }

  dotUpdate['communicationPassport.profilePasscode'] = cleanPasscode;
  dotUpdate['communicationPassport.updatedAt'] = new Date();

  return dotUpdate;
}

function decryptPassport(raw) {
  if (!raw) return raw;
  const p = raw.toObject ? raw.toObject() : { ...raw };

  for (const field of ENCRYPTED_STRING_FIELDS) {
    if (p[field]) p[field] = decrypt(p[field]);
  }

  if (p.trustedContact) {
    p.trustedContact = {
      ...p.trustedContact,
      name: decrypt(p.trustedContact.name),
      phone: decrypt(p.trustedContact.phone),
      email: decrypt(p.trustedContact.email),
    };
  }

  return p;
}

// GET /api/passport/generate-passcode
router.get('/generate-passcode', (req, res) => {
  try {
    const passcode = generateFriendlyPasscode();
    return res.json({ passcode });
  } catch (error) {
    console.error('Error generating passcode:', error);
    return res.status(500).json({ message: 'Error generating passcode' });
  }
});

// POST /api/passport/create
router.post('/create', authenticateToken, passportUpdateMiddleware, validatePassportData, async (req, res) => {
  try {
    const userId = req.user._id;
    const passportData = req.body;

    if (!passportData.profilePasscode || !passportData.profilePasscode.trim()) {
      return res.status(400).json({ message: 'ProfilePasscode is required and cannot be empty.' });
    }

    const cleanPasscode = passportData.profilePasscode.replace(/-/g, '').toUpperCase();

    const existingPasscode = await User.findOne({
      'communicationPassport.profilePasscode': cleanPasscode,
      _id: { $ne: userId }
    });
    if (existingPasscode) {
      return res.status(400).json({ message: 'This passcode is already in use. Please choose a different one.' });
    }

    const normalizedPhone = normalizePhoneNumber(passportData.trustedContact.phone, passportData.trustedContact.countryCode);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Failed to normalize trusted contact phone number.' });
    }
    passportData.trustedContact.phone = normalizedPhone;

    const dotUpdate = encryptPassportForSave(passportData, cleanPasscode);

    // profilePhoto lives at top-level userSchema — never inside the encrypted subdocument
    if (typeof passportData.profilePhoto !== 'undefined') {
      dotUpdate['profilePhoto'] = passportData.profilePhoto;
    }

    // runValidators disabled — passport fields are validated by passportValidator middleware,
    // and encrypted values would fail schema regex validators (e.g. email match)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: dotUpdate },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    // Notify followers
    try {
      const userWithFollowers = await User.findById(userId).select('followers username communicationPassport.profilePasscode');
      const passcode = updatedUser.communicationPassport?.profilePasscode;
      if (userWithFollowers?.followers?.length > 0 && passcode) {
        const Notification = (await import('../models/Notification.js')).default;
        const notifications = userWithFollowers.followers.map(followerObj => ({
          recipient: followerObj.user,
          sender: userId,
          type: 'passport_update',
          title: 'Communication Passport Updated',
          message: `${updatedUser.username} has updated their Communication Passport.`,
          data: { passcode },
          createdAt: new Date()
        }));
        await Notification.insertMany(notifications);
      }
    } catch (notifyErr) {
      console.error('Error sending passport update notifications:', notifyErr);
    }

    return res.json({
      message: 'Communication passport saved successfully',
      passport: decryptPassport(updatedUser.communicationPassport)
    });

  } catch (error) {
    console.error('Error creating communication passport:', error);
    return res.status(500).json({ message: 'Error saving communication passport' });
  }
});

// GET /api/passport/my-passport
router.get('/my-passport', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const foundUser = await User.findById(userId);

    if (!foundUser) return res.status(404).json({ message: 'User not found' });

    if (!foundUser.communicationPassport ||
        Object.keys(foundUser.communicationPassport).length === 0) {
      return res.status(404).json({ message: 'Communication passport not found' });
    }

    return res.json({
      passport: decryptPassport(foundUser.communicationPassport),
      profilePhoto: foundUser.profilePhoto || null
    });
  } catch (error) {
    console.error('Error fetching communication passport:', error);
    return res.status(500).json({ message: 'Error fetching communication passport' });
  }
});

// GET /api/passport/public/:passcode
router.get('/public/:passcode', async (req, res) => {
  try {
    const { passcode } = req.params;

    if (!passcode || !passcode.trim()) {
      return res.status(400).json({ message: 'Invalid passcode parameter.' });
    }

    const cleanPasscode = passcode.replace(/-/g, '').toUpperCase();

    let user = await User.findOne({
      'communicationPassport.profilePasscode': cleanPasscode,
      'communicationPassport.isActive': { $ne: false }
    });

    if (!user) {
      user = await User.findOne({
        'communicationPassport.profilePasscode': passcode,
        'communicationPassport.isActive': { $ne: false }
      });
    }

    if (!user || !user.communicationPassport) {
      return res.status(404).json({ message: 'Communication passport not found' });
    }

    User.updateOne(
      { _id: user._id },
      { $inc: { 'communicationPassport.passportViewCount': 1 } }
    ).catch(err => console.error('Error incrementing view count:', err));

    const p = decryptPassport(user.communicationPassport);

    const publicPassport = {
      ownerId: user._id,
      ownerUsername: user.username,
      firstName: p.firstName,
      lastName: p.lastName,
      preferredName: p.preferredName,
      preferredPronouns: p.preferredPronouns,
      customPronouns: p.customPronouns,
      diagnoses: p.diagnoses,
      customDiagnosis: p.customDiagnosis,
      healthAlert: p.healthAlert,
      customHealthAlert: p.customHealthAlert,
      allergyList: p.allergyList,
      triggers: p.triggers,
      likes: p.likes,
      dislikes: p.dislikes,
      communicationPreferences: p.communicationPreferences,
      customPreferences: p.customPreferences,
      trustedContact: p.trustedContact,
      otherInformation: p.otherInformation,
      communicationMethod: p.communicationMethod,
      avoidWords: p.avoidWords,
      medications: p.medications,
      calmingStrategies: p.calmingStrategies,
      distressSigns: p.distressSigns,
      sensoryNeeds: p.sensoryNeeds,
      profilePhoto: user.profilePhoto || null,
      passportViewCount: (p.passportViewCount || 0) + 1,
      updatedAt: p.updatedAt
    };

    return res.json({ passport: publicPassport });

  } catch (error) {
    console.error('Error fetching public communication passport:', error);
    return res.status(500).json({ message: 'Error fetching communication passport' });
  }
});

// GET /api/passport/managed/:userId
router.get('/managed/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const requesterId = req.user._id;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const isDelegateAllowed = targetUser.delegates.some(d => d.user.equals(requesterId));
    if (!isDelegateAllowed) {
      return res.status(403).json({ message: 'You do not have access to this passport' });
    }

    if (!targetUser.communicationPassport) {
      return res.status(404).json({ message: 'This user has no communication passport' });
    }

    return res.json({
      passport: decryptPassport(targetUser.communicationPassport),
      profilePhoto: targetUser.profilePhoto || null,
      owner: { _id: targetUser._id, username: targetUser.username }
    });
  } catch (error) {
    console.error('Error fetching managed passport:', error);
    return res.status(500).json({ message: 'Error fetching passport' });
  }
});

// POST /api/passport/create-for/:userId
router.post('/create-for/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const requesterId = req.user._id;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const delegateRecord = targetUser.delegates.find(d => d.user.equals(requesterId));
    if (!delegateRecord || delegateRecord.permissions !== 'edit') {
      return res.status(403).json({ message: 'You do not have edit access to this passport' });
    }

    const passportData = req.body;
    const cleanPasscode = passportData.profilePasscode?.replace(/-/g, '').toUpperCase();

    const normalizedPhone = normalizePhoneNumber(
      passportData.trustedContact?.phone,
      passportData.trustedContact?.countryCode
    );
    if (normalizedPhone) passportData.trustedContact.phone = normalizedPhone;

    const dotUpdate = encryptPassportForSave(passportData, cleanPasscode);

    if (typeof passportData.profilePhoto !== 'undefined') {
      dotUpdate['profilePhoto'] = passportData.profilePhoto;
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { $set: dotUpdate },
      { new: true }
    );

    return res.json({
      message: 'Passport updated successfully',
      passport: decryptPassport(updatedUser.communicationPassport)
    });
  } catch (error) {
    console.error('Error updating managed passport:', error);
    return res.status(500).json({ message: 'Error updating passport' });
  }
});

// DELETE /api/passport/delete
router.delete('/delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $unset: { communicationPassport: '' } },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    return res.json({ message: 'Communication passport deleted successfully' });
  } catch (error) {
    console.error('Error deleting communication passport:', error);
    return res.status(500).json({ message: 'Error deleting communication passport' });
  }
});

export default router;
