const { admin } = require('../config/firebase');
const { db } = require('../config/firebase');

// 1. REGISTER MERCHANT (From Scratch or Upgrade)
const registerMerchant = async (req, res) => {
  const { uid, businessName } = req.body;
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return res.status(404).json({ message: "User not found" });

    await userRef.update({
      role: 'merchant',
      businessName: businessName || userDoc.data().name,
      accountBalance: 0,
      terminalCount: 0,
      status: 'active'
    });

    res.json({ message: "User successfully promoted to Merchant status" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. PROMOTE TO MERCHANT (Unified logic)
const promoteToMerchant = async (req, res) => {
  try {
    const { uid, businessName } = req.body;
    if (!uid || !businessName) {
      return res.status(400).json({ message: "UID and Business Name are required" });
    }

    await db.collection('users').doc(uid).update({
      role: 'merchant',
      businessName: businessName
    });

    res.status(200).json({ message: "Account upgraded successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Firebase error: " + error.message });
  }
};

// 3. LINK ESP32 TERMINAL TO MERCHANT
const assignTerminal = async (req, res) => {
    // This matches the "Assign Request Body" you just shared
    const { macAddress, merchantId, label } = req.body; 

    console.log(`Attempting to assign Terminal ${macAddress} to Merchant ${merchantId}`);

    if (!macAddress || !merchantId) {
        return res.status(400).json({ message: "Missing macAddress or merchantId" });
    }

    try {
        // 1. Fetch Merchant Data to get their business name
        const merchantDoc = await db.collection('users').doc(merchantId).get();
        if (!merchantDoc.exists) {
            return res.status(404).json({ message: "Merchant user not found" });
        }
        const merchantData = merchantDoc.data();

        // 2. Update/Create the terminal record
        // We use macAddress as the Document ID
        await db.collection('terminals').doc(macAddress).set({
            macAddress: macAddress,
            merchantId: merchantId,
            merchantName: merchantData.businessName || merchantData.name || "Unnamed Merchant",
            label: label || "Standard Node",
            status: 'active',
            lastSync: new Date().toISOString()
        }, { merge: true });

        res.json({ success: true, message: "Terminal linked successfully" });
    } catch (error) {
        console.error("ASSIGNMENT CRASH:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 4. ASSIGN RFID CARD TO USER
const linkCardToUser = async (req, res) => {
  const { userId, rfidUid } = req.body;
  try {
    const cardCheck = await db.collection('users').where('linkedCard', '==', rfidUid).get();
    if (!cardCheck.empty) {
      return res.status(400).json({ message: "This card is already linked to another user" });
    }

    await db.collection('users').doc(userId).update({
      linkedCard: rfidUid,
      status: 'active'
    });

    res.json({ message: "Card linked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- ADD ANY MISSING FUNCTIONS ---
const addTerminal = async (req, res) => {
  // Placeholder if your routes file still expects this function
  res.status(501).json({ message: "Use assignTerminal instead" });
};

const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  const { userId, status } = req.body; // status will be 'active' or 'blocked'

  try {
    if (!userId || !status) {
      return res.status(400).json({ message: "Missing User ID or Status" });
    }

    await db.collection('users').doc(userId).update({
      status: status // This updates the field your login function checks
    });

    res.json({ message: `User status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// --- GET ALL MERCHANTS ---
const getAllMerchants = async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'merchant').get();
    const merchants = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json(merchants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- GET ALL TERMINALS ---
const getAllTerminals = async (req, res) => {
  try {
    const snapshot = await db.collection('terminals').get();
    const terminals = snapshot.docs.map(doc => doc.data());
    res.json(terminals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export ALL functions
module.exports = { 
  registerMerchant, 
  promoteToMerchant, 
  assignTerminal, 
  addTerminal,
  linkCardToUser,
  getAllUsers,
  toggleUserStatus,
  getAllMerchants,
  getAllTerminals
};