const { db } = require('../config/firebase');

const getAdminStats = async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const terminalsSnap = await db.collection('terminals').get();
    
    let totalBalanceSum = 0;
    let merchants = 0;
    
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.role === 'merchant') {
        merchants++;
        }

      // 2. Sum up ALL balances in the system
      // We check all possible naming conventions you've used (balance or accountBalance)
      const userBalance = Number(data.accountBalance || data.balance || 0);
      totalBalanceSum += userBalance;
      
    });

    res.json({
      totalUsers: usersSnap.size,
      totalMerchants: merchants,
      totalTerminals: terminalsSnap.size,
      networkVolume: totalBalanceSum
    });
  } catch (error) {
    res.status(500).json({ message: "Stats error" });
  }
};

module.exports = { getAdminStats };