const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
  question:    { type: String, required: true, trim: true },
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, trim: true, lowercase: true },
  submittedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new',
  },
});

module.exports =
  mongoose.models.SupportRequest ||
  mongoose.model('SupportRequest', supportRequestSchema);
