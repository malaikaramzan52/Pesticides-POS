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
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  }
};

// ── User API ─────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/users`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },
  update: async (id, userData) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};

// ── Product API ──────────────────────────────────────────────────────────────
export const productApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/products${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  getById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};

// ── Category API ─────────────────────────────────────────────────────────────
export const categoryApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/categories`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};

// ── Company API ──────────────────────────────────────────────────────────────
export const companyApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/companies`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/companies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};

// ── Offer API ────────────────────────────────────────────────────────────────
export const offerApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/offers`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getActive: async () => {
    const res = await fetch(`${API_BASE_URL}/offers/active`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/offers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/offers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/offers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
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
    return handleResponse(res);
  },
  getHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/sales/history${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  getById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/sales/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  payBalance: async (id, paymentData) => {
    const res = await fetch(`${API_BASE_URL}/sales/${id}/pay-balance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
  },
  salesReturn: async (returnData) => {
    const res = await fetch(`${API_BASE_URL}/sales/returns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(returnData)
    });
    return handleResponse(res);
  },
  cancelSale: async (id, cancelData) => {
    const res = await fetch(`${API_BASE_URL}/sales/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cancelData)
    });
    return handleResponse(res);
  }
};

// ── Purchases & Vendors API ──────────────────────────────────────────────────
export const purchaseApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/purchases${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  getById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/purchases/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/purchases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  updateStatus: async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/purchases/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },
  purchaseReturn: async (returnData) => {
    const res = await fetch(`${API_BASE_URL}/purchases/returns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(returnData)
    });
    return handleResponse(res);
  }
};

export const vendorApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/vendors`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/vendors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  getLedger: async (id) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/ledger`, { headers: getHeaders() });
    return handleResponse(res);
  },
  recordPayment: async (id, paymentData) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};

// ── Customers API ────────────────────────────────────────────────────────────
export const customerApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/customers`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  getLedger: async (id) => {
    const res = await fetch(`${API_BASE_URL}/customers/${id}/ledger`, { headers: getHeaders() });
    return handleResponse(res);
  },
  recordPayment: async (id, paymentData) => {
    const res = await fetch(`${API_BASE_URL}/customers/${id}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
  }
};

// ── Expenses API ─────────────────────────────────────────────────────────────
export const expenseApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/expenses${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  getCategories: async () => {
    const res = await fetch(`${API_BASE_URL}/expenses/categories`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createCategory: async (data) => {
    const res = await fetch(`${API_BASE_URL}/expenses/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  }
};

// ── Accounts API ─────────────────────────────────────────────────────────────
export const accountApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/accounts`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  updateOpeningBalances: async (balances) => {
    const res = await fetch(`${API_BASE_URL}/accounts/opening-balances`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(balances)
    });
    return handleResponse(res);
  },
  getStatement: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/accounts/statement${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  }
};

// ── Warehouse API ────────────────────────────────────────────────────────────
export const warehouseApi = {
  getStock: async () => {
    const res = await fetch(`${API_BASE_URL}/warehouse/stock`, { headers: getHeaders() });
    return handleResponse(res);
  },
  transferStock: async (data) => {
    const res = await fetch(`${API_BASE_URL}/warehouse/transfers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  getTransfers: async () => {
    const res = await fetch(`${API_BASE_URL}/warehouse/transfers`, { headers: getHeaders() });
    return handleResponse(res);
  }
};

// ── Reports API ──────────────────────────────────────────────────────────────
export const reportApi = {
  getSalesReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/reports/sales${query ? `?${query}` : ''}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getPurchaseReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/reports/purchases${query ? `?${query}` : ''}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getStockReport: async () => {
    const res = await fetch(`${API_BASE_URL}/reports/stock`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getExpenseReport: async () => {
    const res = await fetch(`${API_BASE_URL}/reports/expenses`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getTrialBalance: async () => {
    const res = await fetch(`${API_BASE_URL}/reports/trial-balance`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getBalanceSheet: async () => {
    const res = await fetch(`${API_BASE_URL}/reports/balance-sheet`, { headers: getHeaders() });
    return handleResponse(res);
  }
};



// ── Settings & Audit API ─────────────────────────────────────────────────────
export const settingsApi = {
  getSettings: async () => {
    const res = await fetch(`${API_BASE_URL}/settings`, { headers: getHeaders() });
    return handleResponse(res);
  },
  updateSettings: async (data) => {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE_URL}/settings/audit-logs`, { headers: getHeaders() });
    return handleResponse(res);
  }
};
