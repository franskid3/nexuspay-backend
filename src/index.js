require('dotenv').config();
console.log("DEBUG: JWT_SECRET is:", process.env.JWT_SECRET);
const express = require('express');
const cors = require('cors');

// Import the main router (No curly braces here)
const apiRoutes = require('./routes/api');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- ROUTES ---
// This one line handles EVERYTHING inside routes/api.js
// It will automatically prepend '/api' to those routes.
app.use('/api', apiRoutes);


// --- START SERVER ---
const PORT = process.env.PORT || 5000; // MUST use process.env.PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});