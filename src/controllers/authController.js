const { admin, db } = require('../config/firebase');
const { hashData, compareData } = require('../utils/hash');
const jwt = require('jsonwebtoken');

/**
 * REGISTER USER / MERCHANT
 * Handled by Admin to create accounts for Users or Merchants
 */
const registerUser = async (req, res) => {
  const { email, password, name, phone, pin, role } = req.body;

  try {
    // 1. Check if this is the first user in the system
    const userCountSnapshot = await db.collection('users').count().get();
    const isFirstUser = userCountSnapshot.data().count === 0;

    // 2. Check if phone number already exists
    const phoneCheck = await db.collection('users').where('phone', '==', phone).get();
    if (!phoneCheck.empty) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    // 3. Create the Firebase Auth Account
    const userAuth = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // 4. Hash sensitive data
    const hashedPin = await hashData(pin);
    const hashedPassword = await hashData(password);

    // 5. Determine Role: First user is always admin, otherwise use requested role
    const assignedRole = isFirstUser ? 'admin' : (role || 'user');

    // 6. Create Firestore Document
    const userData = {
      name,
      phone,
      email,
      password: hashedPassword,
      pin: hashedPin,
      role: assignedRole, // Use the determined role
      status: 'active',
      accountBalance: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 7. Add role-specific fields
    if (assignedRole === 'merchant') {
      userData.accountBalance = 0;
      userData.terminalCount = 0;
      userData.businessName = name;
    } else if (assignedRole === 'admin') {
      userData.isAdminAccount = true; // Flag for extra clarity
    } else {
      userData.accountBalance = 0;
      userData.linkedCard = null;
    }

    await db.collection('users').doc(userAuth.uid).set(userData);

    res.status(201).json({ 
      message: `${assignedRole} registered successfully`, 
      uid: userAuth.uid 
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email
    const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    
    if (userSnapshot.empty) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id; // Store this for easy use

    // 2. Verify account status
    if (userData.status === 'blocked') {
      return res.status(403).json({ message: "Account is suspended. Contact Admin." });
    }

    // 3. Compare Password
    const isMatch = await compareData(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4. Generate JWT for your API
    const token = jwt.sign(
      { uid: userId, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 5. Generate Firebase Custom Token for the Frontend Real-time logic
    // We use userId (the document ID from Firestore) as the UID
    const firebaseToken = await admin.auth().createCustomToken(userId);

    // 6. Send everything to the frontend
    res.json({
      token,
      firebaseToken: firebaseToken,
      role: userData.role,
      name: userData.name,
      uid: userId
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  login
};