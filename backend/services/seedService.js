const User            = require('../models/User');
const Unit            = require('../models/Unit');
const Account         = require('../models/Account');
const Customer        = require('../models/Customer');
const ExpenseCategory = require('../models/ExpenseCategory');
const Category        = require('../models/Category');
const StoreSettings   = require('../models/StoreSettings');
const Company         = require('../models/Company');
const Product         = require('../models/Product');
const WarehouseStock  = require('../models/WarehouseStock');
const bcrypt          = require('bcryptjs');

const seedDefaultData = async () => {
  try {
    console.log('[Seed] Starting database initialization...');

    // ── 1. Units ──────────────────────────────────────────────────────────────
    const unitCount = await Unit.countDocuments();
    if (unitCount === 0) {
      await Unit.insertMany([
        { name: 'Litre',  key: 'Litre' },
        { name: 'Kg',     key: 'Kg' },
        { name: 'Gram',   key: 'Gram' },
        { name: 'ml',     key: 'ml' },
        { name: 'Bag',    key: 'Bag' },
        { name: 'Packet', key: 'Packet' },
        { name: 'Bottle', key: 'Bottle' },
        { name: 'Box',    key: 'Box' },
        { name: 'Piece',  key: 'Piece' },
        { name: 'Dozen',  key: 'Dozen' },
      ]);
      console.log('[Seed] ✓ Units created');
    } else {
      console.log(`[Seed] Units already exist (${unitCount})`);
    }

    // ── 2. Product Categories ─────────────────────────────────────────────────
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      await Category.insertMany([
        { code: 'PEST',  name: 'Pesticides',    description: 'Chemical pesticides & insecticides' },
        { code: 'HERB',  name: 'Herbicides',    description: 'Weed killers & herbicides' },
        { code: 'FUNG',  name: 'Fungicides',    description: 'Fungal disease control' },
        { code: 'FERT',  name: 'Fertilizers',   description: 'NPK & organic fertilizers' },
        { code: 'SEED',  name: 'Seeds',         description: 'Agricultural seeds' },
        { code: 'EQUIP', name: 'Equipment',     description: 'Sprayers & farm equipment' },
        { code: 'MISC',  name: 'Miscellaneous', description: 'General agro products' },
      ]);
      console.log('[Seed] ✓ Categories created');
    } else {
      console.log(`[Seed] Categories already exist (${catCount})`);
    }

    // ── 3. Expense Categories ─────────────────────────────────────────────────
    const expCatCount = await ExpenseCategory.countDocuments();
    if (expCatCount === 0) {
      await ExpenseCategory.insertMany([
        { name: 'Utilities',      description: 'Electricity, Water & Internet Bills' },
        { name: 'Rent',           description: 'Shop & Warehouse Monthly Rent' },
        { name: 'Salaries',       description: 'Staff & Worker Monthly Salaries' },
        { name: 'Transportation', description: 'Freight, Logistics & Fuel Charges' },
        { name: 'Maintenance',    description: 'Shop maintenance & repairs' },
        { name: 'Marketing',      description: 'Advertising & promotions' },
        { name: 'Miscellaneous',  description: 'General Operational Payouts' },
      ]);
      console.log('[Seed] ✓ Expense categories created');
    } else {
      console.log(`[Seed] Expense categories already exist (${expCatCount})`);
    }

    // ── 4. Payment Accounts ───────────────────────────────────────────────────
    const accountCount = await Account.countDocuments();
    if (accountCount === 0) {
      await Account.insertMany([
        { account_name: 'Cash',        type: 'Cash',          provider_name: '',            opening_balance: 0 },
        { account_name: 'HBL',         type: 'Bank',          provider_name: 'Habib Bank',  opening_balance: 0 },
        { account_name: 'Meezan Bank', type: 'Bank',          provider_name: 'Meezan Bank', opening_balance: 0 },
        { account_name: 'EasyPaisa',   type: 'Mobile Wallet', provider_name: 'EasyPaisa',   opening_balance: 0 },
        { account_name: 'JazzCash',    type: 'Mobile Wallet', provider_name: 'JazzCash',    opening_balance: 0 },
        { account_name: 'SadaPay',     type: 'Mobile Wallet', provider_name: 'SadaPay',     opening_balance: 0 },
        { account_name: 'Card',        type: 'Card',          provider_name: '',            opening_balance: 0 },
        { account_name: 'Cheque',      type: 'Cheque',        provider_name: '',            opening_balance: 0 },
      ]);
      console.log('[Seed] ✓ Payment accounts created');
    } else {
      console.log(`[Seed] Accounts already exist (${accountCount})`);
    }

    // ── 5. Walk-in Customer (required for POS) ────────────────────────────────
    const walkIn = await Customer.findOne({ code: 'CUST-WALK' });
    if (!walkIn) {
      await Customer.create({
        code: 'CUST-WALK',
        name: 'Walk-in Customer',
        phone: 'N/A',
        address: 'Counter Cash Sale',
        customer_type: 'Walk-in Customer',
        credit_limit: 0,
        outstanding_balance: 0,
        last_purchase_date: 'Today'
      });
      console.log('[Seed] ✓ Walk-in Customer created');
    } else {
      console.log('[Seed] Walk-in Customer already exists');
    }

    // ── 6. Admin User ─────────────────────────────────────────────────────────
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPasscode = await bcrypt.hash('0000', salt);
      await User.create({
        username: 'admin',
        name: 'Admin User',
        role: 'Admin',
        passcode: hashedPasscode,
        status: 'Active',
        permissions: ['all']
      });
      console.log('[Seed] ✓ Admin user created  (passcode: 0000)');
    } else {
      const isMatch = await adminUser.matchPasscode('0000');
      if (!isMatch) {
        adminUser.passcode = '0000';
        await adminUser.save();
        console.log('[Seed] ✓ Admin passcode synced to 0000');
      } else {
        console.log('[Seed] Admin user already exists');
      }
    }

    // ── 7. Store Settings ─────────────────────────────────────────────────────
    const settingsCount = await StoreSettings.countDocuments();
    if (settingsCount === 0) {
      await StoreSettings.create({
        shop_name:      'Pesticides & Agro Wholesale Depot',
        owner:          'Owner Name',
        licenseNo:      'PEST-2024-0001',
        gstin:          '',
        phone:          '03001234567',
        email:          'info@pesticides.com',
        address:        'Main Bazar, City',
        website:        '',
        receipt_footer: 'Thank you for your business!'
      });
      console.log('[Seed] ✓ Store Settings created');
    } else {
      console.log('[Seed] Store Settings already exist');
    }

    // ── 8. Default Company (Required for Products) ────────────────────────────
    let company = await Company.findOne({});
    if (!company) {
      company = await Company.create({
        code: 'COMP-GEN',
        name: 'General Agro Chemicals',
        contact_person: 'Admin',
        phone: '03001234567',
        status: 'Active'
      });
      console.log('[Seed] ✓ Default Company created');
    }

    // ── 9. Default Products (test4) ───────────────────────────────────────────
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const category = await Category.findOne({ code: 'PEST' }) || await Category.findOne({});
      const unit = await Unit.findOne({ key: 'Litre' }) || await Unit.findOne({});

      const defaultProduct = await Product.create({
        name: 'test4',
        code: 'P-TEST',
        barcode: '1234567890',
        category_id: category ? category._id : null,
        company_id: company ? company._id : null,
        unit_id: unit ? unit._id : null,
        tax_rate: 18,
        tax_type: 'Exclusive',
        dealer_price: 300,
        wholesale_price: 320,
        retail_price: 338,
        farmer_price: 338,
        batches: [
          {
            batch_no: 'BATCH-001',
            stock_qty: 20,
            purchase_rate: 300,
            selling_rate: 338,
            mfg_date: '2026-01-01',
            expiry_date: '2028-12-31'
          }
        ]
      });
      console.log('[Seed] ✓ Default Product "test4" created');

      await WarehouseStock.create({
        product_id: defaultProduct._id,
        product_name: defaultProduct.name,
        code: defaultProduct.code,
        warehouse_qty: 0,
        pos_counter_qty: 20,
        min_alert_qty: 5
      });
      console.log('[Seed] ✓ Default WarehouseStock for "test4" created');
    } else {
      console.log(`[Seed] Products already exist (${productCount})`);
    }

    console.log('[Seed] ✅ Database initialization complete!');

  } catch (error) {
    console.error('[Seed Error]:', error.message);
  }
};

module.exports = { seedDefaultData };
