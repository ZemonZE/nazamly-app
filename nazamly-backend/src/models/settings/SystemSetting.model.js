const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    index: true 
  },
  value: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
