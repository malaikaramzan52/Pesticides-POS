const User = require('../models/User');
const Unit = require('../models/Unit');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const ExpenseCategory = require('../models/ExpenseCategory');
const StoreSettings = require('../models/StoreSettings');

const seedDefaultData = async () => {
  try {
    // 1. Default Admin User
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      await User.create({
        username: 'admin',
        name: 'Admin User',
        role: 'Admin',
        passcode: '0000',
        status: 'Active',
        permissions: ['all']
      });
      console.log('[Seed] Created default Admin user (passcode: 0000)');
    } else {
      const isMatch = await adminUser.matchPasscode('0000');
      if (!isMatch) {
        adminUser.passcode = '0000';
        await adminUser.save();
        console.log('[Seed] Verified & updated Admin user passcode to 0000');
      }
    }

    // 2. Default Units
    const unitCount = await Unit.countDocuments();
    if (unitCount === 0) {
      await Unit.insertMany([
        { name: 'Litre', key: 'Litre' },
        { name: 'Kg', key: 'Kg' },
        { name: 'Bag', key: 'Bag' },
        { name: 'Packet', key: 'Packet' },
        { name: 'Bottle', key: 'Bottle' },
        { name: 'Gram', key: 'Gram' }
      ]);
      console.log('[Seed] Created default measurement units');
    }

    // 3. Default Accounts
    const accountCount = await Account.countDocuments();
    if (accountCount === 0) {
      await Account.insertMany([
        { account_name: 'Cash', type: 'Cash', opening_balance: 0 },
        { account_name: 'HBL', type: 'Bank', provider_name: 'Habib Bank Limited', opening_balance: 0 },
        { account_name: 'Meezan Bank', type: 'Bank', provider_name: 'Meezan Bank', opening_balance: 0 },
        { account_name: 'EasyPaisa', type: 'Mobile Wallet', provider_name: 'EasyPaisa', opening_balance: 0 },
        { account_name: 'JazzCash', type: 'Mobile Wallet', provider_name: 'JazzCash', opening_balance: 0 },
        { account_name: 'SadaPay', type: 'Mobile Wallet', provider_name: 'SadaPay', opening_balance: 0 },
        { account_name: 'Card', type: 'Card', opening_balance: 0 },
        { account_name: 'Cheque', type: 'Cheque', opening_balance: 0 }
      ]);
      console.log('[Seed] Created default payment & bank accounts');
    }

    // 4. Default Walk-in Customer
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
      console.log('[Seed] Created default Walk-in Customer');
    }

    // 5. Default Expense Categories
    const expCatCount = await ExpenseCategory.countDocuments();
    if (expCatCount === 0) {
      await ExpenseCategory.insertMany([
        { name: 'Utilities', description: 'Electricity, Water & Internet Bills', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        { name: 'Rent', description: 'Shop & Warehouse Monthly Rent', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        { name: 'Salaries', description: 'Staff & Worker Monthly Salaries', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { name: 'Transportation', description: 'Freight, Logistics & Fuel Charges', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        { name: 'Miscellaneous', description: 'General Operational Payouts', color: 'bg-gray-50 text-gray-700 border-gray-200' }
      ]);
      console.log('[Seed] Created default expense categories');
    }

    // 6. Default Store Settings
    const settingsCount = await StoreSettings.countDocuments();
    if (settingsCount === 0) {
      await StoreSettings.create({
        shop_name: 'Punjab Pesticides & Agro Wholesale Depot',
        owner: 'Harpreet Singh & Sons',
        licenseNo: 'FERT-PB-2024-9981 / PEST-8812',
        gstin: '03AAAAA0000A1Z5',
        phone: '9876543210',
        email: 'info@punjabpesticides.com',
        address: 'Shop No. 45, Grain Market Road, Sector 3, Bathinda, Punjab 151001',
        website: 'www.punjabpesticides.com',
        receipt_footer: 'Thank you for your business!'
      });
      console.log('[Seed] Created default Store Settings');
    }
  } catch (error) {
    console.error('[Seed Error]:', error.message);
  }
};

module.exports = {
  seedDefaultData
};
