// Mock Data for Pesticides & Agro Chemicals Wholesaler ERP POS

export const COMPANIES = [];

export const CATEGORIES = [];

export const UNITS = [
  { id: 'U1', name: 'Litre' },
  { id: 'U2', name: 'Kg' },
  { id: 'U3', name: 'Bag' },
  { id: 'U4', name: 'Packet' },
  { id: 'U5', name: 'Bottle' },
  { id: 'U6', name: 'Gram' }
];

export const CUSTOMERS = [
  {
    id: 'CUST001',
    code: 'CUST-WALK',
    name: 'Walk-in Customer',
    phone: 'N/A',
    address: 'Counter Cash Sale',
    customer_type: 'Walk-in Customer',
    credit_limit: 0,
    outstanding_balance: 0,
    available_credit: 0,
    last_purchase_date: 'Today',
  }
];

export const PRODUCTS = [];

export const USERS = [
  { id: 'U_ADM', username: 'admin', name: 'Admin User', role: 'Admin', passcode: '0000' }
];

export const MOCK_INVOICES = [];

export const MOCK_HELD_SALES = [];

export const MOCK_EXPENSES = [];

export const AUDIT_LOGS = [];

export const INITIAL_WAREHOUSE_STOCK = [];

// ── LocalStorage Data Persistence Helpers ────────────────────────────────────
export const getStoredData = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const setStoredData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage save error:', e);
  }
};

export const saveProductsToStorage = () => {
  setStoredData('AGRO_ERP_PRODUCTS', PRODUCTS);
};

export const saveCompaniesToStorage = () => {
  setStoredData('AGRO_ERP_COMPANIES', COMPANIES);
};

export const getWarehouseStock = () => {
  const stored = getStoredData('AGRO_ERP_WAREHOUSE_STOCK', null);
  if (stored && Array.isArray(stored)) {
    const isMockWhItem = (item) => {
      const id = (item.id || '').toLowerCase();
      const name = (item.product_name || item.name || '').toLowerCase();
      const code = (item.code || '').toLowerCase();
      return id.includes('p1') || id.includes('p2') || id.includes('p3') || id.includes('p4') || id.includes('p5') ||
             name.includes('glyphosate') || name.includes('imidacloprid') ||
             name.includes('urea') || name.includes('cotton bt') || name.includes('cartap') ||
             code.includes('p-gly') || code.includes('p-imi') || code.includes('p-ure') || code.includes('p-cot') || code.includes('p-car');
    };
    const cleanStock = stored.filter(item => !isMockWhItem(item));
    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', cleanStock);
    return cleanStock;
  }
  setStoredData('AGRO_ERP_WAREHOUSE_STOCK', INITIAL_WAREHOUSE_STOCK);
  return INITIAL_WAREHOUSE_STOCK;
};

export const INITIAL_TRANSFERS = [];

export const getWarehouseTransfers = () => {
  const stored = getStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', null);
  if (stored && Array.isArray(stored)) {
    const cleanTransfers = stored.filter(t => !['TRF-2026-001', 'TRF-2026-002', 'TRF-2026-003'].includes(t.id));
    setStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', cleanTransfers);
    return cleanTransfers;
  }
  setStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', INITIAL_TRANSFERS);
  return INITIAL_TRANSFERS;
};

// Hydrate PRODUCTS from localStorage on app load (with mock item purging)
try {
  const savedProducts = getStoredData('AGRO_ERP_PRODUCTS', null);
  if (savedProducts && Array.isArray(savedProducts)) {
    const isMockProduct = (p) => {
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      return id === 'p1' || id === 'p2' || id === 'p3' || id === 'p4' || id === 'p5' ||
             id.startsWith('mock') ||
             name.includes('glyphosate') || name.includes('imidacloprid') ||
             name.includes('urea') || name.includes('cotton bt') || name.includes('cartap') ||
             code.includes('p-gly') || code.includes('p-imi') || code.includes('p-ure') || code.includes('p-cot') || code.includes('p-car');
    };
    const cleanProducts = savedProducts.filter(p => !isMockProduct(p));
    PRODUCTS.length = 0;
    PRODUCTS.push(...cleanProducts);
    setStoredData('AGRO_ERP_PRODUCTS', cleanProducts);
  }
} catch (e) {
  console.error('Failed to hydrate products from storage:', e);
}

// Hydrate COMPANIES from localStorage on app load (with mock company purging)
try {
  const savedCompanies = getStoredData('AGRO_ERP_COMPANIES', null);
  if (savedCompanies && Array.isArray(savedCompanies)) {
    const isMockComp = (c) => {
      const id = (c.id || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return id === 'c1' || id === 'c2' || id === 'c3' || id === 'c4' || id === 'c5' ||
             id.startsWith('mock') ||
             name.includes('syngenta') || name.includes('bayer') || name.includes('upl') ||
             name.includes('iffco') || name.includes('coromandel') || name.includes('crystal') ||
             name.includes('tara') || name.includes('engro') || name.includes('ffc') ||
             name.includes('fmc') || name.includes('agro corp');
    };
    const cleanCompanies = savedCompanies.filter(c => !isMockComp(c));
    COMPANIES.length = 0;
    COMPANIES.push(...cleanCompanies);
    setStoredData('AGRO_ERP_COMPANIES', cleanCompanies);
  }
} catch (e) {
  console.error('Failed to hydrate companies from storage:', e);
}

// Comprehensive Purge of old cached seed mock records across all localStorage keys
export const clearAllSystemTestData = () => {
  const keysToClear = [
    'AGRO_ERP_PRODUCTS',
    'AGRO_ERP_COMPANIES',
    'AGRO_ERP_CATEGORIES',
    'AGRO_ERP_BRANDS',
    'AGRO_ERP_OFFERS',
    'AGRO_ERP_PURCHASE_ORDERS',
    'AGRO_ERP_INVOICES',
    'AGRO_ERP_HELD_SALES',
    'AGRO_ERP_EXPENSES',
    'AGRO_ERP_EXPENSE_CATEGORIES',
    'AGRO_ERP_RETURN_RECORDS',
    'AGRO_ERP_STOCK_MOVEMENTS',
    'AGRO_ERP_WAREHOUSE_STOCK',
    'AGRO_ERP_WAREHOUSE_TRANSFERS',
    'AGRO_ERP_CUSTOMERS',
    'AGRO_ERP_AUDIT_LOGS',
    'AGRO_ERP_VENDORS',
    'AGRO_ERP_OPENING_BALANCE'
  ];
  keysToClear.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });
  PRODUCTS.length = 0;
  COMPANIES.length = 0;
  CATEGORIES.length = 0;
  MOCK_INVOICES.length = 0;
  MOCK_HELD_SALES.length = 0;
  MOCK_EXPENSES.length = 0;
  AUDIT_LOGS.length = 0;
  INITIAL_WAREHOUSE_STOCK.length = 0;
};

// Auto-run system purge to clear pre-existing test data from browser storage
try {
  // Purge Mock Offers
  const savedOffers = getStoredData('AGRO_ERP_OFFERS', null);
  if (savedOffers && Array.isArray(savedOffers)) {
    const cleanOffers = savedOffers.filter(o => !['OFF-001', 'OFF-002', 'OFF-003'].includes(o.id) && !o.id?.startsWith('MOCK_'));
    setStoredData('AGRO_ERP_OFFERS', cleanOffers);
  }

  // Purge Mock POs
  const savedPOs = getStoredData('AGRO_ERP_PURCHASE_ORDERS', null);
  if (savedPOs && Array.isArray(savedPOs)) {
    const cleanPOs = savedPOs.filter(po => !['PO-2026-001', 'PO-2026-002', 'PO-2026-003'].includes(po.id));
    setStoredData('AGRO_ERP_PURCHASE_ORDERS', cleanPOs);
  }

  // Purge Mock Transfers
  const savedTransfers = getStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', null);
  if (savedTransfers && Array.isArray(savedTransfers)) {
    const cleanTransfers = savedTransfers.filter(t => !['TRF-2026-001', 'TRF-2026-002', 'TRF-2026-003'].includes(t.id));
    setStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', cleanTransfers);
  }

  // Purge Mock Return Records
  const savedReturns = getStoredData('AGRO_ERP_RETURN_RECORDS', null);
  if (savedReturns && Array.isArray(savedReturns)) {
    const cleanReturns = savedReturns.filter(r => !['SR001', 'PR001', 'PR002'].includes(r.id));
    setStoredData('AGRO_ERP_RETURN_RECORDS', cleanReturns);
  }

  // Purge Mock Movements
  const savedMovements = getStoredData('AGRO_ERP_STOCK_MOVEMENTS', null);
  if (savedMovements && Array.isArray(savedMovements)) {
    const cleanMovements = savedMovements.filter(m => !['M1', 'M2', 'M3', 'M4', 'M5'].includes(m.id));
    setStoredData('AGRO_ERP_STOCK_MOVEMENTS', cleanMovements);
  }
} catch (e) {
  console.error('Failed to purge cached seed records from storage:', e);
}

