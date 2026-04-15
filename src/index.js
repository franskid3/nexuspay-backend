require('dotenv').config();
console.log("DEBUG: JWT_SECRET is:", process.env.JWT_SECRET);
const express = require('express');
const cors = require('cors');

// Import the main router (No curly braces here)
const apiRoutes = require('./routes/api');

const app = express();
app.use(express.json());
// --- MIDDLEWARE ---
app.use(cors({
  origin: "*", // For a project demo, "*" (all) is easiest, though less secure than naming the specific URL
  credentials: true
}));


// --- ROUTES ---
// This one line handles EVERYTHING inside routes/api.js
// It will automatically prepend '/api' to those routes.
app.use('/api', apiRoutes);


// --- START SERVER ---
const PORT = process.env.PORT || 5000; // MUST use process.env.PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});