const mongoose = require('mongoose');

const gateEntrySchema = new mongoose.Schema(
  {
    gateEntryNo:       { type: String, required: true },
    vehicleNumber:     { type: String, required: true },
    vehicleType:       { type: String, required: true },
    transporter:       { type: String, required: true },
    inwardType:        { type: String, required: true },
    location:          { type: String, required: true },
    reportingTimeDate: { type: Date, default: Date.now },
    inDateTime:        { type: Date, default: null },
    tareWeight:        { type: Number, default: 0 },
    status:            { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'completed' },
    userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GateEntry', gateEntrySchema);