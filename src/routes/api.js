const express = require('express');
const router = express.Router();

// Import Controllers
const { login, registerUser } = require('../controllers/authController');
const { processTap, handleWebhook } = require('../controllers/paymentController');
const { 
  registerMerchant, 
  assignTerminal, 
  linkCardToUser, 
  promoteToMerchant, // Added this
  addTerminal,        // Added this based on your routes below
  getAllUsers  ,
  toggleUserStatus,    // Added this based on your routes below
  getAllTerminals,   // Added this based on your routes below
  getAllMerchants    // Added this based on your routes below
} = require('../controllers/adminController');
const { getAdminStats } = require('../controllers/dataController');
const { getMerchantData } = require('../controllers/merchantController');
const { topUpWallet, updateFcmToken, getUserProfile, getUserActivity, initializePayment, toggleCardFreeze, changeCardPin } = require('../controllers/userController');



// Import Middleware
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// --- 🔓 PUBLIC ROUTES (No Token Needed) ---
router.post('/auth/login', login);
router.post('/auth/register', registerUser); // Moved here so anybody can register!

router.post('/webhook/paystack', handleWebhook);


// --- 🛰️ HARDWARE ROUTES (ESP32) ---
router.post('/hardware/tap', processTap);

// --- 🔒 PROTECTED ADMIN ROUTES ---
// Everything below this line checks for a valid Token and Admin role
router.use(verifyToken); 
router.get('/merchant/dashboard', getMerchantData);
router.get('/user/profile', getUserProfile);
router.get('/user/activity', getUserActivity);
router.post('/user/initialize-payment', initializePayment);
router.post('/user/toggle-freeze', toggleCardFreeze);
router.post('/user/change-pin', changeCardPin);
router.post('/user/update-fcm-token', updateFcmToken);



router.post('/admin/register-merchant', isAdmin, registerMerchant);
router.post('/admin/assign-terminal', isAdmin, assignTerminal);
router.post('/admin/promote', isAdmin, promoteToMerchant);
router.post('/admin/add-terminal', isAdmin, addTerminal);
router.post('/admin/link-card', isAdmin, linkCardToUser);
router.get('/admin/stats', isAdmin, getAdminStats);
router.post('/admin/topup', isAdmin, topUpWallet);
router.get('/admin/users', isAdmin, getAllUsers);
router.post('/admin/toggle-status', isAdmin, toggleUserStatus);
router.get('/admin/merchants', isAdmin, getAllMerchants); // If you have a 'getMerchants' controller, use that instead
router.get('/admin/terminals', isAdmin, getAllTerminals); // You need to create this controller to fetch terminal data
module.exports = router;