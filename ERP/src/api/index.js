// Strip trailing slashes, ensure /api/v1 is present
const _raw = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
const API_BASE_URL = _raw.endsWith('/api/v1') ? _raw : `${_raw}/api/v1`;

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('agro_pos_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  headers['x-passcode'] = '0000'; // Development fallback header
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data.data !== undefined ? data.data : data;
};

// ── Ultra-Fast SWR & Request Deduplication Engine ───────────────────────────
const memoryCache = new Map();
const inFlightPromises = new Map();

const cachedFetchGet = async (url, ttlMs = 30000) => {
  const cached = memoryCache.get(url);
  const now = Date.now();

  // If cache is fresh (< 30s), return immediately (0ms)
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }

  // Deduplicate active requests to the exact same URL
  if (inFlightPromises.has(url)) {
    return inFlightPromises.get(url);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      memoryCache.set(url, { timestamp: Date.now(), data });
      return data;
    } finally {
      inFlightPromises.delete(url);
    }
  })();

  inFlightPromises.set(url, fetchPromise);

  // If stale cache exists, return stale immediately (0ms) while background fetch updates
  if (cached) {
    fetchPromise.catch(() => {});
    return cached.data;
  }

  return fetchPromise;
};

export const invalidateApiCache = (urlPrefix = '') => {
  if (!urlPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(urlPrefix)) {
      memoryCache.delete(key);
    }
  }
};

// ── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (passcode, username = 'admin') => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ passcode, username })
    });
    return handleResponse(res);
  },
  getMe: async () => {
    return cachedFetchGet(`${API_BASE_URL}/auth/me`, 60000);
  }
};

// ── User API ─────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: async () => {
    return cachedFetchGet(`${API_BASE_URL}/users`, 15000);
  },
  create: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    invalidateApiCache('/users');
    return handleResponse(res);
  },
  update: async (id, userData) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    invalidateApiCache('/users');
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    invalidateApiCache('/users');
    return handleResponse(res);
  }
};

// ── Product API ──────────────────────────────────────────────────────────────
export const productApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/products${query ? `?${query}` : ''}`;
    return cachedFetchGet(url, 20000);
  },
  getById: async (id) => {
    return cachedFetchGet(`${API_BASE_URL}/products/${id}`, 30000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/products');
    invalidateApiCache('/warehouse');
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/products');
    invalidateApiCache('/warehouse');
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    invalidateApiCache('/products');
    invalidateApiCache('/warehouse');
    return handleResponse(res);
  }
};

// ── Category API ─────────────────────────────────────────────────────────────
export const categoryApi = {
  getAll: async () => {
    return cachedFetchGet(`${API_BASE_URL}/categories`, 60000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/categories');
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/categories');
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    invalidateApiCache('/categories');
    return handleResponse(res);
  }
};

// ── Company API ──────────────────────────────────────────────────────────────
export const companyApi = {
  getAll: async () => {
    return cachedFetchGet(`${API_BASE_URL}/companies`, 60000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/companies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/companies');
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/companies');
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    invalidateApiCache('/companies');
    return handleResponse(res);
  }
};

// ── Offer API ────────────────────────────────────────────────────────────────
export const offerApi = {
  getAll: async () => {
    return cachedFetchGet(`${API_BASE_URL}/offers`, 30000);
  },
  getActive: async () => {
    return cachedFetchGet(`${API_BASE_URL}/offers/active`, 30000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/offers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/offers');
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/offers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/offers');
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/offers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    invalidateApiCache('/offers');
    return handleResponse(res);
  }
};

// ── Sales & POS API ──────────────────────────────────────────────────────────
export const salesApi = {
  createPosSale: async (saleData) => {
    const res = await fetch(`${API_BASE_URL}/sales/pos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(saleData)
    });
    invalidateApiCache('/sales');
    invalidateApiCache('/products');
    invalidateApiCache('/customers');
    invalidateApiCache('/accounts');
    invalidateApiCache('/reports');
    return handleResponse(res);
  },
  getHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/sales/history${query ? `?${query}` : ''}`;
    return cachedFetchGet(url, 15000);
  },
  getById: async (id) => {
    return cachedFetchGet(`${API_BASE_URL}/sales/${id}`, 30000);
  },
  payBalance: async (id, paymentData) => {
    const res = await fetch(`${API_BASE_URL}/sales/${id}/pay-balance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    invalidateApiCache('/sales');
    invalidateApiCache('/customers');
    invalidateApiCache('/accounts');
    return handleResponse(res);
  },
  salesReturn: async (returnData) => {
    const res = await fetch(`${API_BASE_URL}/sales/returns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(returnData)
    });
    invalidateApiCache('/sales');
    invalidateApiCache('/products');
    invalidateApiCache('/customers');
    invalidateApiCache('/accounts');
    return handleResponse(res);
  },
  cancelSale: async (id, cancelData) => {
    const res = await fetch(`${API_BASE_URL}/sales/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cancelData)
    });
    invalidateApiCache('/sales');
    invalidateApiCache('/products');
    invalidateApiCache('/customers');
    invalidateApiCache('/accounts');
    return handleResponse(res);
  }
};

// ── Purchases & Vendors API ──────────────────────────────────────────────────
export const purchaseApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/purchases${query ? `?${query}` : ''}`;
    return cachedFetchGet(url, 15000);
  },
  getById: async (id) => {
    return cachedFetchGet(`${API_BASE_URL}/purchases/${id}`, 30000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/purchases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/purchases');
    invalidateApiCache('/vendors');
    invalidateApiCache('/products');
    return handleResponse(res);
  },
  updateStatus: async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/purchases/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    invalidateApiCache('/purchases');
    invalidateApiCache('/vendors');
    invalidateApiCache('/products');
    return handleResponse(res);
  },
  purchaseReturn: async (returnData) => {
    const res = await fetch(`${API_BASE_URL}/purchases/returns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(returnData)
    });
    invalidateApiCache('/purchases');
    invalidateApiCache('/vendors');
    invalidateApiCache('/products');
    return handleResponse(res);
  }
};

export const vendorApi = {
  getAll: async () => {
    return cachedFetchGet(`${API_BASE_URL}/vendors`, 20000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/vendors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/vendors');
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/vendors');
    return handleResponse(res);
  },
  getLedger: async (id) => {
    return cachedFetchGet(`${API_BASE_URL}/vendors/${id}/ledger`, 15000);
  },
  recordPayment: async (id, paymentData) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    invalidateApiCache('/vendors');
    invalidateApiCache('/accounts');
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    invalidateApiCache('/vendors');
    return handleResponse(res);
  }
};

// ── Customers API ────────────────────────────────────────────────────────────
export const customerApi = {
  getAll: async () => {
    return cachedFetchGet(`${API_BASE_URL}/customers`, 20000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/customers');
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/customers');
    return handleResponse(res);
  },
  getLedger: async (id) => {
    return cachedFetchGet(`${API_BASE_URL}/customers/${id}/ledger`, 15000);
  },
  recordPayment: async (id, paymentData) => {
    const res = await fetch(`${API_BASE_URL}/customers/${id}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    invalidateApiCache('/customers');
    invalidateApiCache('/accounts');
    return handleResponse(res);
  }
};

// ── Expenses API ─────────────────────────────────────────────────────────────
export const expenseApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/expenses${query ? `?${query}` : ''}`;
    return cachedFetchGet(url, 20000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/expenses');
    invalidateApiCache('/accounts');
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    invalidateApiCache('/expenses');
    invalidateApiCache('/accounts');
    return handleResponse(res);
  },
  getCategories: async () => {
    return cachedFetchGet(`${API_BASE_URL}/expenses/categories`, 60000);
  },
  createCategory: async (data) => {
    const res = await fetch(`${API_BASE_URL}/expenses/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/expenses/categories');
    return handleResponse(res);
  }
};

// ── Accounts API ─────────────────────────────────────────────────────────────
export const accountApi = {
  getAll: async () => {
    return cachedFetchGet(`${API_BASE_URL}/accounts`, 20000);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/accounts');
    return handleResponse(res);
  },
  updateOpeningBalances: async (balances) => {
    const res = await fetch(`${API_BASE_URL}/accounts/opening-balances`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(balances)
    });
    invalidateApiCache('/accounts');
    return handleResponse(res);
  },
  getStatement: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/accounts/statement${query ? `?${query}` : ''}`;
    return cachedFetchGet(url, 15000);
  }
};

// ── Warehouse API ────────────────────────────────────────────────────────────
export const warehouseApi = {
  getStock: async () => {
    return cachedFetchGet(`${API_BASE_URL}/warehouse/stock`, 15000);
  },
  transferStock: async (data) => {
    const res = await fetch(`${API_BASE_URL}/warehouse/transfers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/warehouse');
    invalidateApiCache('/products');
    return handleResponse(res);
  },
  getTransfers: async () => {
    return cachedFetchGet(`${API_BASE_URL}/warehouse/transfers`, 15000);
  }
};

// ── Reports API ──────────────────────────────────────────────────────────────
export const reportApi = {
  getSalesReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return cachedFetchGet(`${API_BASE_URL}/reports/sales${query ? `?${query}` : ''}`, 15000);
  },
  getPurchaseReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return cachedFetchGet(`${API_BASE_URL}/reports/purchases${query ? `?${query}` : ''}`, 15000);
  },
  getStockReport: async () => {
    return cachedFetchGet(`${API_BASE_URL}/reports/stock`, 15000);
  },
  getExpenseReport: async () => {
    return cachedFetchGet(`${API_BASE_URL}/reports/expenses`, 15000);
  },
  getTrialBalance: async () => {
    return cachedFetchGet(`${API_BASE_URL}/reports/trial-balance`, 15000);
  },
  getBalanceSheet: async () => {
    return cachedFetchGet(`${API_BASE_URL}/reports/balance-sheet`, 15000);
  }
};

// ── Settings & Audit API ─────────────────────────────────────────────────────
export const settingsApi = {
  getSettings: async () => {
    return cachedFetchGet(`${API_BASE_URL}/settings`, 60000);
  },
  updateSettings: async (data) => {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    invalidateApiCache('/settings');
    return handleResponse(res);
  },
  getAuditLogs: async () => {
    return cachedFetchGet(`${API_BASE_URL}/settings/audit-logs`, 15000);
  }
};
