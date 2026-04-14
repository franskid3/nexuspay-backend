const { db, admin } = require('../config/firebase');

// controllers/userController.js

const topUpWallet = async (req, res) => {
  // IMPORTANT: The Admin sends 'userId' in the body. 
  // If your code uses req.user.uid, the Admin will top up THEIR OWN account by mistake!
  const { userId, amount } = req.body; 

  try {
    if (!userId || !amount) {
      return res.status(400).json({ message: "User ID and Amount are required" });
    }

    const userRef = db.collection('users').doc(userId);
    
    // Check if user exists
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update accountBalance (Number)
    await userRef.update({
      accountBalance: admin.firestore.FieldValue.increment(Number(amount))
    });

    // Create a transaction record so it shows in the UI history
    await db.collection('transactions').add({
      userId: userId,
      amount: Number(amount),
      type: 'topup',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'success'
    });

    res.status(200).json({ message: `Successfully added ₦${amount}` });
  } catch (error) {
    console.error("Topup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// userController.js -> getUserProfile
const getUserProfile = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found" });
    
    const userData = userDoc.data();

    // Standardize the balance logic here
    // We prioritize accountBalance because that's what your Admin top-up uses
    const actualBalance = userData.accountBalance ?? userData.balance ?? 0;

    res.json({
      ...userData,
      balance: actualBalance, // Frontend will now always find 'balance'
      accountBalance: actualBalance // Keep this for compatibility
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// --- FIX: Activity Log ---
const getUserActivity = async (req, res) => {
  // Use .uid because that's what your log showed!
  const userId = req.user.uid; 
  const { limit = 5, lastVisibleId } = req.query;

  try {
    let query = db.collection('transactions')
      .where('userId', '==', userId) // Make sure your DB field is 'userId'
      .orderBy('timestamp', 'desc')
      .limit(Number(limit));

    if (lastVisibleId) {
      const lastDoc = await db.collection('transactions').doc(lastVisibleId).get();
      if (lastDoc.exists) query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      activities,
      lastId: activities.length > 0 ? activities[activities.length - 1].id : null
    });
  } catch (error) {
    console.error("Activity Error:", error);
    res.status(500).json({ message: "Error fetching activity" });
  }
};

// --- NEW: Update FCM Token ---
const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const uid = req.user.uid;

    if (!fcmToken) return res.status(400).json({ message: "Token required" });

    await db.collection('users').doc(uid).update({ fcmToken });
    res.json({ message: "Notification token updated" });
  } catch (error) {
    console.error("FCM Update Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Don't forget to export it at the bottom!
module.exports = { 
  // ... other exports
  getUserActivity, 
  updateFcmToken 
};


const axios = require('axios');

const initializePayment = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.uid;
  const userEmail = req.user.email;

  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: userEmail,
      amount: amount * 100, // Paystack uses Kobo (₦1 = 100)
      metadata: { userId: userId } // IMPORTANT: Keep track of who is paying
    }, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });

    res.json(response.data.data); // Sends the URL back to frontend
  } catch (error) {
    res.status(500).json({ message: "Payment Gateway Error" });
  }
};

// Toggle Card Freeze Status
const toggleCardFreeze = async (req, res) => {
  const { userId } = req.body; 
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return res.status(404).json({ message: "User not found" });

    // Switch between 'active' and 'blocked'
    const currentStatus = userDoc.data().status;
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';

    await userRef.update({ status: newStatus });

    res.json({ 
      status: "success", 
      message: `Card is now ${newStatus}`,
      newStatus: newStatus 
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// Change Card PIN
const bcrypt = require('bcryptjs'); // Make sure this is installed: npm install bcrypt

const changeCardPin = async (req, res) => {
  const { userId, newPin } = req.body;

  if (!userId || !newPin || newPin.length !== 4) {
    return res.status(400).json({ message: "Invalid PIN format" });
  }

  try {
    // 1. Generate a salt and hash the PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(newPin, salt);

    // 2. Update Firestore with the HASHED version
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ 
      pin: hashedPin // Now storing the secure hash, e.g., "$2b$10$..."
    });

    res.json({ status: "success", message: "PIN updated securely" });
  } catch (error) {
    console.error("PIN Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { topUpWallet, updateFcmToken, getUserProfile, getUserActivity, initializePayment, toggleCardFreeze, changeCardPin };