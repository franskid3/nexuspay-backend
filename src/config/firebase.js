// const admin = require('firebase-admin');
// const serviceAccount = require('../../serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// const db = admin.firestore();
// const auth = admin.auth();

// module.exports = { admin, db, auth };

const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // If it's a string from .env or Render, parse it
    serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string' 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : process.env.FIREBASE_SERVICE_ACCOUNT;
  } catch (err) {
    console.error("Firebase Key Parse Error:", err);
  }
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase Connected via Environment Variables");
}

const db = admin.firestore();
module.exports = { db, admin };