const mongoose = require('mongoose');

const warehouseStockSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  product_name: { type: String, required: true },
  code: { type: String, required: true },
  warehouse_qty: { type: Number, default: 0, min: 0 },
  pos_counter_qty: { type: Number, default: 0, min: 0 },
  min_alert_qty: { type: Number, default: 15 },
  location: { type: String, default: 'Rack A1' }
}, { timestamps: true });

module.exports = mongoose.model('WarehouseStock', warehouseStockSchema);
