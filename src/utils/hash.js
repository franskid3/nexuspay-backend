const bcrypt = require('bcryptjs');

const hashData = async (plainText) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainText, salt);
};

const compareData = async (plainText, hashedText) => {
  return await bcrypt.compare(plainText, hashedText);
};

module.exports = { hashData, compareData };