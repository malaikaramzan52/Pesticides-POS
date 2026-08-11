/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Pesticides POS — MongoDB Atlas DB Initializer
 * Run: node scripts/initDb.js
 *
 * Creates all collections, enforces indexes, and seeds essential default data
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Import all models ────────────────────────────────────────────────────────
const Account         = require('../models/Account');
const AuditLog        = require('../models/AuditLog');
const Brand           = require('../models/Brand');
const Category        = require('../models/Category');
const Company         = require('../models/Company');
const Customer        = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const Expense         = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const Offer           = require('../models/Offer');
const Product         = require('../models/Product');
const PurchaseOrder   = require('../models/PurchaseOrder');
const PurchaseReturn  = require('../models/PurchaseReturn');
const SaleInvoice     = require('../models/SaleInvoice');
const SalesReturn     = require('../models/SalesReturn');
const StoreSettings   = require('../models/StoreSettings');
const Unit            = require('../models/Unit');
const User            = require('../models/User');
const Vendor          = require('../models/Vendor');
const VendorPayment   = require('../models/VendorPayment');
const WarehouseStock  = require('../models/WarehouseStock');
const WarehouseTransfer = require('../models/WarehouseTransfer');

const MONGO_URI = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI;

// ── Colour helpers ────────────────────────────────────────────────────────────
const c = {
  green:  (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red:    (t) => `\x1b[31m${t}\x1b[0m`,
  cyan:   (t) => `\x1b[36m${t}\x1b[0m`,
  bold:   (t) => `\x1b[1m${t}\x1b[0m`,
};

function log(emoji, msg)  { console.log(`  ${emoji}  ${msg}`); }
function ok(model, msg)   { log('OK', `${c.green(model.padEnd(22))} ${msg}`); }
function skip(model, msg) { log('--', `${c.yellow(model.padEnd(22))} ${msg}`); }
function fail(model, msg) { log('ERR', `${c.red(model.padEnd(22))} ${msg}`); }

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

const SEED = {

  units: [
    { name: 'Kg' }, { name: 'Gram' }, { name: 'Litre' },
    { name: 'ml' }, { name: 'Packet' }, { name: 'Bottle' },
    { name: 'Box' }, { name: 'Bag' }, { name: 'Piece' },
    { name: 'Dozen' },
  ],

  categories: [
    { code: 'PEST',  name: 'Pesticides',    description: 'Chemical pesticides & insecticides' },
    { code: 'HERB',  name: 'Herbicides',    description: 'Weed killers & herbicides' },
    { code: 'FUNG',  name: 'Fungicides',    description: 'Fungal disease control' },
    { code: 'FERT',  name: 'Fertilizers',   description: 'NPK & organic fertilizers' },
    { code: 'SEED',  name: 'Seeds',         description: 'Agricultural seeds' },
    { code: 'EQUIP', name: 'Equipment',     description: 'Sprayers & farm equipment' },
    { code: 'MISC',  name: 'Miscellaneous', description: 'General agro products' },
  ],

  brands: [
    { name: 'Syngenta' }, { name: 'Bayer' }, { name: 'BASF' },
    { name: 'FMC' }, { name: 'Dow AgroSciences' }, { name: 'Corteva' },
    { name: 'Nufarm' }, { name: 'UPL' }, { name: 'Local Brand' },
  ],

  expenseCategories: [
    { name: 'Rent',          description: 'Shop/warehouse rent' },
    { name: 'Salaries',      description: 'Staff salaries & wages' },
    { name: 'Electricity',   description: 'Utility bills' },
    { name: 'Transport',     description: 'Delivery & freight' },
    { name: 'Maintenance',   description: 'Shop maintenance & repairs' },
    { name: 'Marketing',     description: 'Advertising & promotions' },
    { name: 'Miscellaneous', description: 'Other expenses' },
  ],

  accounts: [
    { account_name: 'Cash in Hand',     type: 'Cash',          provider_name: '',                account_number: '',               opening_balance: 0, status: 'Active' },
    { account_name: 'HBL Bank Account', type: 'Bank',          provider_name: 'Habib Bank',      account_number: '0001234567890',  opening_balance: 0, status: 'Active' },
    { account_name: 'JazzCash',         type: 'Mobile Wallet', provider_name: 'Jazz',            account_number: '03001234567',    opening_balance: 0, status: 'Active' },
    { account_name: 'EasyPaisa',        type: 'Mobile Wallet', provider_name: 'Telenor',         account_number: '03001234567',    opening_balance: 0, status: 'Active' },
  ],

  walkInCustomer: {
    code: 'WALK-001',
    name: 'Walk-in Customer',
    phone: 'N/A',
    email: '',
    address: 'N/A',
    customer_type: 'Walk-in Customer',
    credit_limit: 0,
    outstanding_balance: 0,
    status: 'Active',
  },

  adminUser: {
    username: 'admin',
    name: 'Administrator',
    role: 'Admin',
    passcode: '1234',
    status: 'Active',
    permissions: ['*'],
  },

  storeSettings: {
    shop_name:      'Pesticides & Agro Wholesale Depot',
    owner:          'Owner Name',
    licenseNo:      'PEST-2024-0001',
    gstin:          '',
    phone:          '03001234567',
    email:          'info@pesticides.com',
    address:        'Main Bazar, City',
    website:        '',
    receipt_footer: 'Thank you for your business!',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function syncIndexes(ModelClass) {
  try {
    await ModelClass.syncIndexes();
    ok(ModelClass.modelName, 'indexes synced');
  } catch (err) {
    fail(ModelClass.modelName, `index sync failed: ${err.message}`);
  }
}

async function seedMany(ModelClass, items, uniqueField) {
  let created = 0, skipped = 0;
  for (const item of items) {
    try {
      const existing = await ModelClass.findOne({ [uniqueField]: item[uniqueField] });
      if (existing) { skipped++; continue; }
      await ModelClass.create(item);
      created++;
    } catch (err) {
      fail(ModelClass.modelName, `${item[uniqueField]}: ${err.message}`);
    }
  }
  ok(ModelClass.modelName, `${created} created, ${skipped} already exist`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n================================================');
  console.log('  Pesticides POS - MongoDB Atlas DB Initializer');
  console.log('================================================\n');

  if (!MONGO_URI) {
    console.error('ERROR: MONGODB_URI not set in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to:', mongoose.connection.host, '\n');

  // ── Step 1: Sync all indexes (creates collections automatically) ───────────
  console.log('-- Step 1: Syncing Indexes for all 22 collections --');
  const ALL_MODELS = [
    Account, AuditLog, Brand, Category, Company,
    Customer, CustomerPayment, Expense, ExpenseCategory, Offer,
    Product, PurchaseOrder, PurchaseReturn, SaleInvoice, SalesReturn,
    StoreSettings, Unit, User, Vendor, VendorPayment,
    WarehouseStock, WarehouseTransfer,
  ];
  for (const M of ALL_MODELS) {
    await syncIndexes(M);
  }

  // ── Step 2: Seed Units ────────────────────────────────────────────────────
  console.log('\n-- Step 2: Units --');
  await seedMany(Unit, SEED.units, 'name');

  // ── Step 3: Seed Categories ───────────────────────────────────────────────
  console.log('\n-- Step 3: Categories --');
  await seedMany(Category, SEED.categories, 'code');

  // ── Step 4: Seed Brands ───────────────────────────────────────────────────
  console.log('\n-- Step 4: Brands --');
  await seedMany(Brand, SEED.brands, 'name');

  // ── Step 5: Seed Expense Categories ──────────────────────────────────────
  console.log('\n-- Step 5: Expense Categories --');
  await seedMany(ExpenseCategory, SEED.expenseCategories, 'name');

  // ── Step 6: Seed Accounts ─────────────────────────────────────────────────
  console.log('\n-- Step 6: Accounts --');
  await seedMany(Account, SEED.accounts, 'account_name');

  // ── Step 7: Walk-in Customer ──────────────────────────────────────────────
  console.log('\n-- Step 7: Walk-in Customer --');
  const existingWalkIn = await Customer.findOne({ code: 'WALK-001' });
  if (existingWalkIn) {
    skip('Customer', 'Walk-in already exists');
  } else {
    await Customer.create(SEED.walkInCustomer);
    ok('Customer', 'Walk-in Customer created');
  }

  // ── Step 8: Admin User ────────────────────────────────────────────────────
  console.log('\n-- Step 8: Admin User --');
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (existingAdmin) {
    skip('User', 'admin already exists');
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashedPasscode = await bcrypt.hash(SEED.adminUser.passcode, salt);
    await User.create({ ...SEED.adminUser, passcode: hashedPasscode });
    ok('User', 'admin created  (login passcode: 1234)');
  }

  // ── Step 9: Store Settings ────────────────────────────────────────────────
  console.log('\n-- Step 9: Store Settings --');
  const existingSettings = await StoreSettings.findOne({});
  if (existingSettings) {
    skip('StoreSettings', 'already exists');
  } else {
    await StoreSettings.create(SEED.storeSettings);
    ok('StoreSettings', 'created with defaults');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n================================================');
  const dbName = mongoose.connection.db.databaseName;
  console.log(`  Database: ${dbName}`);
  console.log('  Document counts per collection:');
  for (const M of ALL_MODELS) {
    const count = await M.countDocuments();
    console.log(`    ${M.modelName.padEnd(22)} ${count} docs`);
  }
  console.log('================================================');
  console.log('\n  DB initialization complete!\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
