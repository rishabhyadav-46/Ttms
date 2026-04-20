const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName:    { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:    { type: String, required: true },
    role:        { type: String, enum: ['operator', 'admin'], default: 'operator' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);