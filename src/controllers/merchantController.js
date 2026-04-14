const { db } = require('../config/firebase');

const getMerchantData = async (req, res) => {
  try {
    // 1. Get the UID from the decoded token (provided by verifyToken middleware)
    const merchantId = req.user.uid;

    if (!merchantId) {
      return res.status(401).json({ message: "Unauthorized: No merchant ID found" });
    }

    // 2. Get Merchant Profile
    const merchantDoc = await db.collection('users').doc(merchantId).get();
    
    // Safety check: if document doesn't exist, return empty defaults
    if (!merchantDoc.exists) {
      return res.json({
        balance: 0,
        businessName: "New Merchant",
        terminals: [],
        transactions: []
      });
    }

    const merchantData = merchantDoc.data();

    // 3. Get Terminals linked to this Merchant
    const terminalsSnapshot = await db.collection('terminals')
      .where('merchantId', '==', merchantId)
      .get();
    
    const terminals = terminalsSnapshot.docs.map(doc => ({
      macAddress: doc.id,
      ...doc.data()
    }));

    // 4. Get Recent Transactions
    // NOTE: If this part fails, it's likely because you need a Firestore Index.
    // Check your server console for the auto-generated Link to create the index.
    let transactions = [];
    try {
      const txSnapshot = await db.collection('transactions')
        .where('merchantId', '==', merchantId)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      transactions = txSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().timestamp?.toDate().toLocaleString() || "Just now"
      }));
    } catch (indexError) {
      console.error("Firestore Index Error or Missing Collection:", indexError.message);
      // Fallback: return empty transactions instead of crashing the whole dashboard
      transactions = [];
    }

    // 5. Final Response
    res.json({
      balance: merchantData.accountBalance || 0,
      businessName: merchantData.businessName || "Unnamed Business",
      terminals: terminals,
      transactions: transactions
    });

  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json({ 
      message: "Error fetching dashboard", 
      error: error.message 
    });
  }
};

module.exports = { getMerchantData };