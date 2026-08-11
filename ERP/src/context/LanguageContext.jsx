import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredData, setStoredData } from '../utils/mockData';
import { locales, DEFAULT_LANGUAGE } from '../i18n/index.js';

const LanguageContext = createContext();

export const TRANSLATIONS = {
  // Legacy Flat Translations Map for Backwards Compatibility
  'app_title': { en: 'Pesticides ERP', ur: 'پیسٹی سائیڈز ERP' },
  'dashboard': { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  'pos': { en: 'POS Counter', ur: 'پوائنٹ آف سیل (POS)' },
  'customers': { en: 'Customers', ur: 'کسٹمرز (گاہک)' },
  'products': { en: 'Products', ur: 'پروڈکٹس اور سٹاک' },
  'reports': { en: 'Reports & Analytics', ur: 'رپورٹس اور تجزیہ' },
  'expenses': { en: 'Expenses Management', ur: 'اخراجات کا انتظام' },
  'expense_categories': { en: 'Expense Categories', ur: 'اخراجات کی کیٹیگریز' },
  'sales': { en: 'Sales History', ur: 'فروخت کا ریکارڈ (سیلز)' },
  'returns': { en: 'Sale Return', ur: 'سیل واپسی' },
  'cancel_sale': { en: 'Cancel Sale', ur: 'سیل منسوخی' },
  'purchase_return': { en: 'Purchase Return', ur: 'پرچیز واپسی' },
  'cancel_purchase': { en: 'Cancel Purchase', ur: 'پرچیز منسوخی' },
  'return_history': { en: 'Return History', ur: 'واپسی کی ہسٹری' },
  'general_ledger': { en: 'Journal Ledger', ur: 'جرنل لیجر' },
  'vendor_ledger': { en: 'Supplier Ledger', ur: 'سپلائر لیجر' },
  'customer_ledger': { en: 'Customer Ledger', ur: 'کسٹمر لیجر' },
  'expense_ledger': { en: 'Expense Ledger', ur: 'ایکسپینس لیجر' },
  'cash_book': { en: 'Cash Drawer Book', ur: 'کیش دراز بک' },
  'trial_balance': { en: 'Trial Balance', ur: 'ٹرائل بیلنس' },
  'balance_sheet': { en: 'Balance Sheet', ur: 'بیلنس شیٹ' },
  'warehouse': { en: 'Warehouse', ur: 'ویر ہاؤس (گودام)' },
  'offers': { en: 'Offers & Schemes', ur: 'آفرز اور سکیمیں' },
  'settings': { en: 'Store Settings', ur: 'سٹور سیٹنگز' },
  'users': { en: 'Users Management', ur: 'صارفین کا انتظام (یوزرز)' },
  'categories': { en: 'Product Categories', ur: 'پروڈکٹ کیٹیگریز' },
  'companies': { en: 'Company', ur: 'کمپنیاں اور سپلائرز' },
  'purchases': { en: 'Purchase Orders', ur: 'پرچیز آرڈرز' },

  // Header Bar
  'language': { en: 'Language', ur: 'زبان' },
  'english': { en: 'English', ur: 'English' },
  'urdu': { en: 'اردو (Urdu)', ur: 'اردو' },
  'search_placeholder': { en: 'Search anything in ERP...', ur: 'ای آر پی میں کچھ بھی تلاش کریں...' },
  'notifications': { en: 'Notifications', ur: 'اطلاعات' },
  'calculator': { en: 'Quick Calculator', ur: 'کیلکولیٹر' },
  'calendar': { en: 'Calendar', ur: 'کیلنڈر' },

  // Expense Module & Account Drawer
  'add_new_expense': { en: 'Add New Expense', ur: 'نیا خرچہ درج کریں' },
  'expense_history': { en: 'Expense History', ur: 'اخراجات کی ہسٹری' },
  'paid_from_account': { en: 'Paid From Account', ur: 'ادائیگی کا اکاؤنٹ' },
  'account_details': { en: 'Account Details', ur: 'اکاؤنٹ کی تفصیلات' },
  'account_statement': { en: 'Account Statement & History', ur: 'اکاؤنٹ سٹیٹمنٹ اور ہسٹری' },
  'all_accounts': { en: 'All Paid From Accounts', ur: 'تمام اکاؤنٹس' },
  'opening_balance': { en: 'Opening Balance', ur: 'ابتدائی بیلنس' },
  'total_money_in': { en: 'Total Money In', ur: 'کل آمدن (منی ان)' },
  'total_money_out': { en: 'Total Money Out', ur: 'کل اخراجات (منی آؤٹ)' },
  'current_balance': { en: 'Current Balance', ur: 'موجودہ بیلنس' },
  'running_balance': { en: 'Running Balance', ur: 'رننگ بیلنس' },
  'date': { en: 'Date', ur: 'تاریخ' },
  'transaction_type': { en: 'Transaction Type', ur: 'ٹرانزیکشن کی قسم' },
  'ref_no': { en: 'Ref / Voucher No.', ur: 'ریفرنس / واؤچر نمبر' },
  'description': { en: 'Description / Particulars', ur: 'تفصیلات' },
  'amount': { en: 'Amount', ur: 'رقم' },
  'recorded_by': { en: 'Recorded By', ur: 'اندراج کنندہ' },
  'action': { en: 'Action', ur: 'ایکشن' },
  'status': { en: 'Status', ur: 'سٹیٹس' },

  // Actions & Buttons
  'search': { en: 'Search', ur: 'تلاش کریں' },
  'reset': { en: 'Reset', ur: 'ری سیٹ' },
  'export_csv': { en: 'Export CSV', ur: 'ایکسپورٹ CSV' },
  'print_pdf': { en: 'Print / PDF', ur: 'پرنٹ / پی ڈی ایف' },
  'close_drawer': { en: 'Close Drawer', ur: 'ڈراز بند کریں' },
  'save': { en: 'Save', ur: 'محفوظ کریں' },
  'cancel': { en: 'Cancel', ur: 'منسوخ کریں' },
  'confirm': { en: 'Confirm', ur: 'تصدیق کریں' },
  'delete': { en: 'Delete', ur: 'حذف کریں' },
  'edit': { en: 'Edit', ur: 'ترمیم کریں' },

  // Accounts List
  'cash_account': { en: 'Cash Account', ur: 'کیش اکاؤنٹ' },
  'bank_account': { en: 'Bank Account', ur: 'بینک اکاؤنٹ' },
  'bank_transfer': { en: 'Bank Transfer', ur: 'بینک ٹرانسفر' },
  'easypaisa': { en: 'EasyPaisa Mobile Wallet', ur: 'ایزی پیسہ' },
  'jazzcash': { en: 'JazzCash Mobile Wallet', ur: 'جاز کیش' },
  'sadapay': { en: 'SadaPay / NayaPay', ur: 'سدا پیسہ / نیا پیسہ' },
  'card': { en: 'Credit / Debit Card', ur: 'کریڈٹ / ڈیبٹ کارڈ' },
  'cheque': { en: 'Cheque Clearance', ur: 'چیک' },

  // POS & Cart
  'search_product': { en: 'Search product by name, barcode, code...', ur: 'پروڈکٹ کا نام یا بارکوڈ تلاش کریں...' },
  'select_customer': { en: 'Select Customer', ur: 'کسٹمر منتخب کریں' },
  'walk_in_customer': { en: 'Walk-in Customer', ur: 'عام گاہک (واک ان)' },
  'cart_summary': { en: 'Cart Summary', ur: 'کارٹ کا خلاصہ' },
  'subtotal': { en: 'Subtotal', ur: 'ذیلی کل' },
  'discount': { en: 'Discount', ur: 'ڈسکاؤنٹ' },
  'tax': { en: 'Tax', ur: 'ٹیکس' },
  'grand_total': { en: 'Grand Total', ur: 'کل قابل ادا رقم' },
  'pay_now': { en: 'Pay Now / Charge', ur: 'ادائیگی وصول کریں' },
  'hold_bill': { en: 'Hold Bill', ur: 'بل ہولڈ کریں' },
  'held_sales': { en: 'Held Sales', ur: 'ہولڈ شدہ سیلز' },
  'qty': { en: 'Qty', ur: 'مقدار' },
  'unit_price': { en: 'Unit Price', ur: 'فی اکائی قیمت' },

  // Vendors & Suppliers Panel
  'vendor_management_panel': { en: 'Vendor Management Panel', ur: 'سپلائر / وینڈر مینجمنٹ پینل' },
  'vendor_catalogue_sub': { en: 'Agro Chemicals & Pesticides Wholesaler Supplier Catalogue', ur: 'زرعی ادویات و کھاد سپلائر کیٹلاگ' },
  'add_new_vendor': { en: 'Add New Vendor', ur: 'نیا سپلائر شامل کریں' },
  'date_location_filters': { en: 'DATE & LOCATION FILTERS', ur: 'تاریخ اور جگہ کے فلٹرز' },
  'showing_all_records': { en: 'Showing all time records', ur: 'تمام دورانیے کے ریکارڈز دکھائے جا رہے ہیں' },
  'filter_vendor_catalogue': { en: 'FILTER VENDOR CATALOGUE', ur: 'سپلائر کیٹلاگ فلٹر کریں' },
  'filter_phone_number': { en: 'Filter Phone Number', ur: 'فون نمبر سے تلاش...' },
  'filter_contact_person': { en: 'Filter Contact Person', ur: 'رابطہ شخص سے تلاش...' },
  'filter_company_name': { en: 'Filter Company Name', ur: 'کمپنی کے نام سے تلاش...' },
  'all_status': { en: 'All Status (Active / Inactive)', ur: 'تمام سٹیٹس (فعال / غیر فعال)' },
  'vendor_id': { en: 'VENDOR ID', ur: 'سپلائر آئی ڈی' },
  'company_name': { en: 'COMPANY NAME', ur: 'کمپنی کا نام' },
  'contact_person': { en: 'CONTACT PERSON', ur: 'رابطہ شخص' },
  'phone_number': { en: 'PHONE NUMBER', ur: 'فون نمبر' },
  'city': { en: 'CITY', ur: 'شہر' },
  'supplied_products': { en: 'SUPPLIED PRODUCTS & QTY', ur: 'سپلائی شدہ پروڈکٹس اور مقدار' },
  'logout': { en: 'Logout', ur: 'لاگ آؤٹ' },

  // Date Filter Presets & Cities
  'all_time': { en: 'All Time', ur: 'تمام دورانیہ' },
  'today': { en: 'Today', ur: 'آج' },
  'yesterday': { en: 'Yesterday', ur: 'گزشتہ کل' },
  'this_week': { en: 'This Week', ur: 'اس ہفتے' },
  'this_month': { en: 'This Month', ur: 'اس مہینے' },
  'custom_range': { en: 'Custom Range', ur: 'مخصوص تاریخیں' },
  'all_cities': { en: 'All Cities', ur: 'تمام شہر' },

  // Product Catalog Table & Recent Sales Invoices
  'product_name': { en: 'Product Name', ur: 'پروڈکٹ کا نام' },
  'sku': { en: 'SKU', ur: 'ایس کے یو / کوڈ' },
  'category': { en: 'Category', ur: 'کیٹیگری' },
  'stock': { en: 'Stock', ur: 'سٹاک' },
  'unit': { en: 'Unit', ur: 'اکائی (یونٹ)' },
  'price': { en: 'Price', ur: 'قیمت' },
  'add': { en: 'Add', ur: 'شامل کریں' },
  'prev': { en: 'Prev', ur: 'پچھلا' },
  'next': { en: 'Next', ur: 'اگلا' },
  'page': { en: 'Page', ur: 'صفحہ' },
  'of': { en: 'of', ur: 'از' },
  'products_count': { en: 'products', ur: 'پروڈکٹس' },
  'in_cart': { en: 'In Cart', ur: 'کارٹ میں' },
  'out_of_stock': { en: 'Out', ur: 'ختم' },
  'recent_sales_invoices': { en: 'Recent Sales Invoices', ur: 'حالیہ سیلز انوائسز' },
  'invoice_id': { en: 'Invoice ID', ur: 'انوائس آئی ڈی' },
  'customer': { en: 'Customer', ur: 'گاہک (کسٹمر)' },
  'date_time': { en: 'Date & Time', ur: 'تاریخ اور وقت' },
  'total': { en: 'Total', ur: 'کل رقم' },
  'payment': { en: 'Payment', ur: 'ادائیگی' },
  'actions': { en: 'Actions', ur: 'ایکشنز' },
  'mixed_cash_credit': { en: 'Mixed (Cash + Credit)', ur: 'مکسڈ (کیش + ادھار)' },
  'credit_payment': { en: 'Credit', ur: 'ادھار' },
  'cash_payment': { en: 'Cash', ur: 'کیش (نقد)' },

  // Categories Urdu Map
  'cat_pesticides': { en: 'Pesticides', ur: 'پیسٹی سائیڈز (ادویات)' },
  'cat_fungicides': { en: 'Fungicides', ur: 'پھپھوندی کش (فنجی سائیڈز)' },
  'cat_fertilizers': { en: 'Fertilizers', ur: 'کھاد (فرٹیلائزرز)' },
  'cat_seeds': { en: 'Seeds', ur: 'بیج (سیڈز)' },
  'cat_agro_chemicals': { en: 'Agro Chemicals', ur: 'زرعی کیمیکلز' },

  // Units Urdu Map
  'unit_litre': { en: 'Litre', ur: 'لیٹر' },
  'unit_bottle_500': { en: 'Bottle (500ml)', ur: 'بوتل (500ml)' },
  'unit_kg': { en: 'Kg', ur: 'کلوگرام' },
  'unit_bag_50': { en: 'Bag (50Kg)', ur: 'بوری (50Kg)' },
  'unit_packet_1': { en: 'Packet (1Kg)', ur: 'پیکٹ (1Kg)' },
  'unit_gram': { en: 'Gram', ur: 'گرام' },

  // Common Statuses & Toast
  'completed': { en: 'Completed', ur: 'مکمل' },
  'pending': { en: 'Pending', ur: 'زیر التواء' },
  'cancelled': { en: 'Cancelled', ur: 'منسوخ' },
  'paid': { en: 'Paid', ur: 'ادا شدہ' },
  'unpaid': { en: 'Unpaid', ur: 'غیر ادا شدہ' },
  'refunded': { en: 'Refunded', ur: 'واپس شدہ' },
  'active': { en: 'Active', ur: 'فعال' },
  'inactive': { en: 'Inactive', ur: 'غیر فعال' }
};

// Build reverse lookup dictionary for automatic English -> Urdu matching
const REVERSE_LOOKUP = {};
Object.keys(TRANSLATIONS).forEach(key => {
  const item = TRANSLATIONS[key];
  if (item && item.en && item.ur) {
    REVERSE_LOOKUP[item.en.trim().toLowerCase()] = item.ur;
  }
});

// Direct phrase overrides
const PHRASE_DICTIONARY = {
  'vendor management panel': 'سپلائر / وینڈر مینجمنٹ پینل',
  'add new vendor': 'نیا سپلائر شامل کریں',
  'filter vendor catalogue': 'سپلائر کیٹلاگ فلٹر کریں',
  'filter company name...': 'کمپنی کے نام سے تلاش...',
  'filter contact person...': 'رابطہ شخص سے تلاش...',
  'filter phone number...': 'فون نمبر سے تلاش...',
  'all status (active / inactive)': 'تمام سٹیٹس (فعال / غیر فعال)',
  'product name': 'پروڈکٹ کا نام',
  'sku': 'ایس کے یو / کوڈ',
  'category': 'کیٹیگری',
  'stock': 'سٹاک',
  'unit': 'اکائی (یونٹ)',
  'price': 'قیمت',
  'add': 'شامل کریں',
  'prev': 'پچھلا',
  'next': 'اگلا',
  'page': 'صفحہ',
  'of': 'از',
  'products': 'پروڈکٹس',
  'in cart': 'کارٹ میں',
  'out': 'ختم',
  'recent sales invoices': 'حالیہ سیلز انوائسز',
  'invoice id': 'انوائس آئی ڈی',
  'customer': 'گاہک (کسٹمر)',
  'date & time': 'تاریخ اور وقت',
  'total': 'کل رقم',
  'payment': 'ادائیگی',
  'actions': 'ایکشنز',
  'cash': 'کیش (نقد)',
  'mixed (cash + credit)': 'مکسڈ (کیش + ادھار)',
  'credit': 'ادھار',
  'paid': 'ادا شدہ',
  'all time': 'تمام دورانیہ',
  'today': 'آج',
  'yesterday': 'گزشتہ کل',
  'this week': 'اس ہفتے',
  'this month': 'اس مہینے',
  'custom range': 'مخصوص تاریخیں',
  'all cities': 'تمام شہر',
  'date & location filters': 'تاریخ اور جگہ کے فلٹرز',
  'showing all time records': 'تمام دورانیے کے ریکارڈز دکھائے جا رہے ہیں',
  'logout': 'لاگ آؤٹ'
};

/**
 * Safely resolves nested keys e.g. "navigation.dashboard" or "pos.cart_summary"
 */
function getNestedTranslation(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return typeof curr === 'string' ? curr : undefined;
}

function triggerGoogleTranslate(lang) {
  // Google Translate auto-DOM translation deactivated to keep Business/User Data untranslated
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return getStoredData('AGRO_ERP_LANGUAGE', DEFAULT_LANGUAGE);
  });

  const isRTL = language === 'ur';

  const applyLanguageDOMSettings = (lang) => {
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('translate', 'no');
    if (lang === 'ur') {
      document.body.classList.add('font-urdu');
      document.body.classList.add('notranslate');
    } else {
      document.body.classList.remove('font-urdu');
      document.body.classList.remove('notranslate');
    }
  };

  const setLanguage = (lang) => {
    setLanguageState(lang);
    setStoredData('AGRO_ERP_LANGUAGE', lang);
    applyLanguageDOMSettings(lang);
  };

  useEffect(() => {
    applyLanguageDOMSettings(language);
  }, [language]);

  /**
   * System UI translation function
   * Supports:
   * 1. System nested keys e.g. t('navigation.dashboard') or t('common.save')
   * 2. System legacy flat keys e.g. t('app_title')
   * 3. Fallback string / key return for English default and business data preservation
   * 
   * NOTE: User-generated & Business Data (Product names, Customer names, Company names,
   * Invoice numbers, SKUs, Phone numbers, Prices, Dates, Transaction references)
   * pass directly into JSX as variables and are preserved intact.
   */
  const t = (key, fallback) => {
    if (!key) return fallback || '';

    const langDict = locales[language] || locales[DEFAULT_LANGUAGE];
    const defaultDict = locales[DEFAULT_LANGUAGE];

    // 1. Check nested path in selected language e.g. "navigation.dashboard"
    const nestedValue = getNestedTranslation(langDict, key);
    if (nestedValue !== undefined) return nestedValue;

    // 2. Check legacy flat TRANSLATIONS dictionary
    if (TRANSLATIONS[key] && TRANSLATIONS[key][language]) {
      return TRANSLATIONS[key][language];
    }

    // 3. Fallback to default language nested path (en)
    if (language !== DEFAULT_LANGUAGE) {
      const nestedDefault = getNestedTranslation(defaultDict, key);
      if (nestedDefault !== undefined) return nestedDefault;
    }

    // 4. If English mode, return fallback text or key
    if (language === 'en') {
      return fallback !== undefined ? fallback : key;
    }

    // 5. Check System UI phrase overrides
    const textToMatch = (fallback || key || '').toString().trim().toLowerCase();
    if (PHRASE_DICTIONARY[textToMatch]) {
      return PHRASE_DICTIONARY[textToMatch];
    }

    // 6. Business Data Preservation: return original text/fallback untouched for user-generated data
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key, fallback) => fallback || key,
      isRTL: false
    };
  }
  return context;
}
