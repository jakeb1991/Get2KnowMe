// server/src/routes/safety-plan-routes.js
import express from 'express';
import { encrypt, decrypt } from '../utils/encryption.js';
import { authenticateToken } from '../utils/auth.js';
import User from '../models/User.js';
import { normalizePhoneNumber } from '../utils/phoneNormalization.js';

const router = express.Router();

// Freetext fields encrypted at rest
const ENCRYPTED_FREETEXT_FIELDS = [
  'thingsOfHope', 'warningSigns', 'triggers', 'safetyActions',
  'whatToDo', 'whatNotToDo', 'safeSpaces', 'afterCrisisNeeds'
];

/**
 * Build a dot-notation $set update object for safetyPlan.
 * Encrypts freetext fields and sensitive contact sub-fields.
 * Leaves crisisPasscode, countryCode, and relationship as plaintext.
 */
function encryptPlan(data) {
  const dotUpdate = {};

  for (const field of ENCRYPTED_FREETEXT_FIELDS) {
    if (field in data) {
      dotUpdate[`safetyPlan.${field}`] = encrypt(data[field] || '');
    }
  }

  if ('crisisPasscode' in data) {
    dotUpdate['safetyPlan.crisisPasscode'] = data.crisisPasscode;
  }

  if ('isActive' in data) {
    dotUpdate['safetyPlan.isActive'] = data.isActive;
  }

  if (Array.isArray(data.safeContacts)) {
    dotUpdate['safetyPlan.safeContacts'] = data.safeContacts.map(contact => ({
      name: encrypt(contact.name || ''),
      phone: encrypt(contact.phone || ''),
      email: encrypt(contact.email || ''),
      countryCode: contact.countryCode || 'GB',
      relationship: contact.relationship || ''
    }));
  }

  dotUpdate['safetyPlan.updatedAt'] = new Date();

  return dotUpdate;
}

/**
 * Decrypt a safetyPlan subdocument (Mongoose doc or plain object).
 * Returns a plain JS object with all freetext and contact fields decrypted.
 */
function decryptPlan(raw) {
  if (!raw) return raw;
  const p = raw.toObject ? raw.toObject() : { ...raw };

  for (const field of ENCRYPTED_FREETEXT_FIELDS) {
    if (p[field]) p[field] = decrypt(p[field]);
  }

  if (Array.isArray(p.safeContacts)) {
    p.safeContacts = p.safeContacts.map(contact => ({
      ...contact,
      name: contact.name ? decrypt(contact.name) : '',
      phone: contact.phone ? decrypt(contact.phone) : '',
      email: contact.email ? decrypt(contact.email) : ''
    }));
  }

  return p;
}

// POST /api/safety-plan/create
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const planData = req.body;

    // Sanitise and validate crisisPasscode if provided
    let cleanPasscode = null;
    if (planData.crisisPasscode && planData.crisisPasscode.trim()) {
      cleanPasscode = planData.crisisPasscode.replace(/-/g, '').toUpperCase();

      const existingPasscode = await User.findOne({
        'safetyPlan.crisisPasscode': cleanPasscode,
        _id: { $ne: userId }
      });
      if (existingPasscode) {
        return res.status(400).json({
          message: 'This crisis passcode is already in use. Please choose a different one.'
        });
      }
    }

    // Normalise phone numbers for each safeContact
    if (Array.isArray(planData.safeContacts)) {
      planData.safeContacts = planData.safeContacts.map(contact => {
        if (contact.phone) {
          const normalised = normalizePhoneNumber(contact.phone, contact.countryCode || 'GB');
          if (normalised) contact.phone = normalised;
        }
        return contact;
      });
    }

    // Substitute cleaned passcode before encrypting
    if (cleanPasscode !== null) {
      planData.crisisPasscode = cleanPasscode;
    }

    const dotUpdate = encryptPlan(planData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: dotUpdate },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    return res.json({
      message: 'Safety plan saved successfully',
      plan: decryptPlan(updatedUser.safetyPlan)
    });

  } catch (error) {
    console.error('Error creating safety plan:', error);
    return res.status(500).json({ message: error.message || 'Error saving safety plan' });
  }
});

// GET /api/safety-plan/my-plan
router.get('/my-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const foundUser = await User.findById(userId);

    if (!foundUser) return res.status(404).json({ message: 'User not found' });

    if (!foundUser.safetyPlan || Object.keys(foundUser.safetyPlan).length === 0) {
      return res.status(404).json({ message: 'Safety plan not found' });
    }

    return res.json({ plan: decryptPlan(foundUser.safetyPlan) });

  } catch (error) {
    console.error('Error fetching safety plan:', error);
    return res.status(500).json({ message: 'Error fetching safety plan' });
  }
});

// GET /api/safety-plan/view/:passcode  (public — no auth required)
router.get('/view/:passcode', async (req, res) => {
  try {
    const { passcode } = req.params;

    if (!passcode || !passcode.trim()) {
      return res.status(400).json({ message: 'Invalid passcode parameter.' });
    }

    const cleanPasscode = passcode.replace(/-/g, '').toUpperCase();

    const user = await User.findOne({
      'safetyPlan.crisisPasscode': cleanPasscode,
      'safetyPlan.isActive': { $ne: false }
    });

    if (!user || !user.safetyPlan) {
      return res.status(404).json({ message: 'Safety plan not found' });
    }

    const p = decryptPlan(user.safetyPlan);

    // Return all fields except crisisPasscode
    const publicPlan = {
      ownerId: user._id,
      ownerUsername: user.username,
      thingsOfHope: p.thingsOfHope,
      warningSigns: p.warningSigns,
      triggers: p.triggers,
      safetyActions: p.safetyActions,
      whatToDo: p.whatToDo,
      whatNotToDo: p.whatNotToDo,
      safeSpaces: p.safeSpaces,
      safeContacts: p.safeContacts,
      afterCrisisNeeds: p.afterCrisisNeeds,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };

    return res.json({ plan: publicPlan });

  } catch (error) {
    console.error('Error fetching public safety plan:', error);
    return res.status(500).json({ message: 'Error fetching safety plan' });
  }
});

// DELETE /api/safety-plan/delete
router.delete('/delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $unset: { safetyPlan: '' } },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    return res.json({ message: 'Safety plan deleted successfully' });

  } catch (error) {
    console.error('Error deleting safety plan:', error);
    return res.status(500).json({ message: 'Error deleting safety plan' });
  }
});

// GET /api/safety-plan/encryption-test  (temporary diagnostic — no auth)
router.get('/encryption-test', (req, res) => {
  try {
    const test = encrypt('hello');
    const result = decrypt(test);
    res.json({ ok: result === 'hello', message: 'Encryption is working correctly.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
