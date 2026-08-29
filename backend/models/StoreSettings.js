const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  shop_name: { type: String, default: 'Pak Agro Pesticides & Seeds Wholesale Depot' },
  owner: { type: String, default: 'Tariq Mahmood & Sons' },
  licenseNo: { type: String, default: 'FERT-PK-2024-9981 / PEST-8812' },
  gstin: { type: String, default: 'NTN-9876543-1' },
  phone: { type: String, default: '+92 300 1234567' },
  email: { type: String, default: 'info@pakagroerp.pk' },
  address: { type: String, default: 'Shop No. 45, Grain Market Road, Multan, Punjab, Pakistan' },
  website: { type: String, default: 'www.pakagroerp.pk' },
  receipt_footer: { type: String, default: 'Thank you for your business!' }
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
