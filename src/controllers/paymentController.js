const { db, admin } = require('../config/firebase'); // admin is already here
const bcrypt = require('bcryptjs');

const processTap = async (req, res) => {
  console.log("LOG: Request received with body:", req.body);
  const { rfidUid, pin, terminalMac, amount } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ 
      status: "error", 
      errorCode: "ERR_AMT", 
      message: "Invalid transaction amount" 
    });
  }

  try {
    // 1. Identify Terminal
    const terminalDoc = await db.collection('terminals').doc(terminalMac).get();
    if (!terminalDoc.exists) {
      console.log("LOG: Missing fields");
      return res.status(404).json({ status: "error", errorCode: "ERR_TERM", message: "Terminal unauthorized" });
    }
    const { merchantId } = terminalDoc.data();

    // 2. Identify User
    const userQuery = await db.collection('users').where('linkedCard', '==', rfidUid).limit(1).get();
    if (userQuery.empty) {
      console.log("LOG: No user found with RFID:", rfidUid);
      return res.status(404).json({ status: "error", errorCode: "ERR_CARD", message: "Card not registered" });
    }
    
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // 3. Security Checks
    if (userData.status === 'blocked') {
      console.log("LOG: Blocked card attempt for user:", userId);
      return res.status(403).json({ 
        status: "error", 
        errorCode: "ERR_LOCK", 
        message: "This card has been frozen by the user." 
      });
    }

    if (!userData.pin) {
      console.log("LOG: User has no PIN set:", userId);
      return res.status(401).json({ 
        status: "error", 
        errorCode: "ERR_NO_PIN", 
        message: "Transaction PIN not set" 
      });
    }

    const isPinValid = await bcrypt.compare(pin.toString(), userData.pin); 
    if (!isPinValid) {
      console.log("LOG: Invalid PIN attempt for user:", userId);
      return res.status(401).json({ 
        status: "error", 
        errorCode: "ERR_PIN", 
        message: "Invalid PIN" 
      });
    }

    const currentBalance = userData.accountBalance || 0; 
    if (currentBalance < amount) {
      console.log(`LOG: Insufficient balance for user ${userId}. Current: ${currentBalance}, Required: ${amount}`);
      return res.status(400).json({ status: "error", errorCode: "ERR_BAL", message: "Insufficient balance" });
    }

    // Get Business Name
    const merchantDoc = await db.collection('users').doc(merchantId).get();
    const businessName = merchantDoc.exists ? merchantDoc.data().name : "NexusPay Merchant";

    // 4. ATOMIC TRANSACTION
    await db.runTransaction(async (t) => {
      const userRef = db.collection('users').doc(userId);
      const merchantRef = db.collection('users').doc(merchantId); 
      const transactionRef = db.collection('transactions').doc();

      t.update(userRef, { accountBalance: admin.firestore.FieldValue.increment(-Number(amount)) });
      t.update(merchantRef, { accountBalance: admin.firestore.FieldValue.increment(Number(amount)) });

      t.set(transactionRef, {
        userId,
        merchantId,
        terminalId: terminalMac,
        amount: Number(amount),
        type: "payment",
        userName: userData.name,
        businessName: businessName, 
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "verified"
      });
    });

    // 5. SEND NOTIFICATION (Inside Try, after successful transaction)
    const fcmToken = userData.fcmToken;
    if (fcmToken) {
      const message = {
        notification: {
          title: 'Payment Successful 💸',
          body: `You just paid ₦${amount} to ${businessName}.`
        },
        data: {
          type: "PAYMENT_CONFIRMATION",
          amount: amount.toString()
        },
        token: fcmToken
      };

      admin.messaging().send(message)
        .then((response) => console.log('Successfully sent message:', response))
        .catch((error) => console.error('FCM Error:', error));
    }

    // 6. RESPONSE
    res.json({ status: "success", errorCode: "SUC_01", message: "Payment Successful" });

  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ status: "error", errorCode: "ERR_SERVER", message: "Internal transaction failure" });
  }
  // Logic removed from here to prevent double-sending/errors
};

const handleWebhook = async (req, res) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const userId = event.data.metadata.userId;
    const amountInNaira = event.data.amount / 100;

    const userRef = db.collection('users').doc(userId);

    await userRef.update({
      accountBalance: admin.firestore.FieldValue.increment(amountInNaira)
    });

    await db.collection('transactions').add({
      userId,
      amount: amountInNaira,
      type: 'topup',
      gatewayRef: event.data.reference,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  res.sendStatus(200);
};

module.exports = { processTap, handleWebhook };