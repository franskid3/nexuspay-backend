const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  pin: { type: String, required: true }, // For terminal/card auth
  role: { 
    type: String, 
    enum: ['user', 'merchant', 'admin'], 
    default: 'user' 
  },
  businessName: { type: String, default: "" }, // Only filled for merchants
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);