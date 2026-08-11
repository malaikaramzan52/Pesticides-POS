const mongoose = require('mongoose');

const warehouseTransferSchema = new mongoose.Schema({
  transfer_no: { type: String, required: true, unique: true, trim: true },
  date: { type: String, required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  from: { type: String, default: 'Central Warehouse' },
  to: { type: String, default: 'POS Counter' },
  status: { type: String, default: 'Completed' },
  requested_by: { type: String, default: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('WarehouseTransfer', warehouseTransferSchema);
