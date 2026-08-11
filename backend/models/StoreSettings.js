const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  shop_name: { type: String, default: 'Punjab Pesticides & Agro Wholesale Depot' },
  owner: { type: String, default: 'Harpreet Singh & Sons' },
  licenseNo: { type: String, default: 'FERT-PB-2024-9981 / PEST-8812' },
  gstin: { type: String, default: '03AAAAA0000A1Z5' },
  phone: { type: String, default: '9876543210' },
  email: { type: String, default: 'info@punjabpesticides.com' },
  address: { type: String, default: 'Shop No. 45, Grain Market Road, Sector 3, Bathinda, Punjab 151001' },
  website: { type: String, default: 'www.punjabpesticides.com' },
  receipt_footer: { type: String, default: 'Thank you for your business!' }
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
