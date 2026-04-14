const { db } = require('../config/firebase');

const getAdminStats = async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const terminalsSnap = await db.collection('terminals').get();
    
    let revenue = 0;
    let merchants = 0;
    
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.role === 'merchant') {
        merchants++;
        revenue += (data.balance || 0);
      }
    });

    res.json({
      totalUsers: usersSnap.size,
      totalMerchants: merchants,
      totalTerminals: terminalsSnap.size,
      revenue: revenue
    });
  } catch (error) {
    res.status(500).json({ message: "Stats error" });
  }
};

module.exports = { getAdminStats };