import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import POSScreen from './components/POSScreen';
import CustomersScreen from './components/CustomersScreen';
import ProductsScreen from './components/ProductsScreen';
import ReportsScreen from './components/ReportsScreen';
import SettingsScreen from './components/SettingsScreen';
import InventoryScreen from './components/InventoryScreen';
import PurchaseOrderScreen from './components/PurchaseOrderScreen';
import SuppliersScreen from './components/SuppliersScreen';
import SalesReturnScreen from './components/SalesReturnScreen';
import SalesScreen from './components/SalesScreen';
import CategoriesScreen from './components/CategoriesScreen';
import CompaniesScreen from './components/CompaniesScreen';
import CancelSaleScreen from './components/CancelSaleScreen';
import CancelPurchaseScreen from './components/CancelPurchaseScreen';
import ExpensesScreen from './components/ExpensesScreen';
import UsersScreen from './components/UsersScreen';
import WarehouseScreen from './components/WarehouseScreen';
import LoginScreen from './components/LoginScreen';
import GeneralLedgerScreen from './components/GeneralLedgerScreen';
import VendorLedgerScreen from './components/VendorLedgerScreen';
import ExpenseLedgerScreen from './components/ExpenseLedgerScreen';
import CustomerLedgerScreen from './components/CustomerLedgerScreen';
import TrialBalanceScreen from './components/TrialBalanceScreen';
import AccountDetailsScreen from './components/AccountDetailsScreen';
import OffersScreen from './components/OffersScreen';
import BalanceSheetScreen from './components/BalanceSheetScreen';
import { POSProvider } from './context/POSContext';
import { useLanguage } from './context/LanguageContext';
import { salesApi, expenseApi, settingsApi, customerApi, vendorApi, purchaseApi, productApi } from './api';

import { USERS, MOCK_INVOICES, MOCK_HELD_SALES, AUDIT_LOGS, MOCK_EXPENSES, CUSTOMERS, COMPANIES } from './utils/mockData';
import { ShieldAlert, AlertCircle, Sparkles, CheckCircle2, Construction, XCircle, Info, X, AlertTriangle } from 'lucide-react';

const TAB_LABELS = {
  categories: 'Categories',
  companies: 'Companies',
  sales: 'Sales',
  expenses: 'Expenses',
  expense_categories: 'Expense Categories',
  users: 'Users',
  returns: 'Sale Return',
  cancel_sale: 'Cancel Sale',
  purchase_return: 'Purchase Return',
  cancel_purchase: 'Cancel Purchase',
  return_history: 'Return History',
  reports: 'Reports',
  trial_balance: 'Trial Balance',
  balance_sheet: 'Balance Sheet',
  settings: 'Settings',
  warehouse: 'Warehouse',
  offers: 'Offers & Schemes',
  account_details: 'Account Summary'
};

function PlaceholderScreen({ tab }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white border border-gray-200 rounded-2xl p-10 max-w-md w-full shadow-sm text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto">
          <Construction size={30} className="text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wide">
            {t(`navigation.${tab}`, TAB_LABELS[tab] || tab)}
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {t('common.under_development', 'This module is under development and will be available in the next release.')}
          </p>
        </div>
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full">
          {t('common.coming_soon', 'Coming Soon')}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const { isRTL, t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(USERS[0]); // Default to Anil Sharma (Admin)
  const [branch, setBranch] = useState('Bathinda H.O.');
  const [counter, setCounter] = useState('Counter A');
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [accountDetailsTarget, setAccountDetailsTarget] = useState('Cash');
  
  // Always scroll to top whenever tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeTab]);
  
  // Shared Live POS States
  const [invoices, setInvoices] = useState([]);
  const [heldSales, setHeldSales] = useState(MOCK_HELD_SALES);
  const [auditLogs, setAuditLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Live Backend Data Hydration
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [salesRes, expRes, logRes] = await Promise.all([
          salesApi.getHistory().catch(() => []),
          expenseApi.getAll().catch(() => []),
          settingsApi.getAuditLogs().catch(() => [])
        ]);
        if (salesRes && Array.isArray(salesRes)) setInvoices(salesRes);
        if (expRes && Array.isArray(expRes)) setExpenses(expRes);
        if (logRes && Array.isArray(logRes)) setAuditLogs(logRes);
      } catch (err) {
        console.log('Backend sync warning:', err.message);
      }
    };
    loadBackendData();
  }, []);

  // Refresh invoices from DB (called after return/cancel)
  const refreshInvoices = async () => {
    try {
      const salesRes = await salesApi.getHistory().catch(() => null);
      if (salesRes && Array.isArray(salesRes)) setInvoices(salesRes);
    } catch (_) {}
  };

  // Global Date Filter State
  const [dateFilter, setDateFilter] = useState({ preset: 'All Time', startDate: '', endDate: '' });

  // Global City Filter State
  const [selectedCity, setSelectedCity] = useState('All');

  // Compute all unique cities dynamically, including full Pakistan list and customer cities
  const allCities = useMemo(() => {
    const cities = new Set([
      "Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Peshawar", "Multan", 
      "Hyderabad", "Islamabad", "Quetta", "Sargodha", "Sialkot", "Bahawalpur", "Sukkur", 
      "Jhang", "Sheikhupura", "Mardan", "Gujrat", "Larkana", "Kasur", "Rahim Yar Khan", 
      "Sahiwal", "Okara", "Wah Cantonment", "Dera Ghazi Khan", "Mirpur Khas", "Chiniot", 
      "Nawabshah", "Kamoke", "Burewala", "Jhelum", "Sadiqabad", "Khanewal", "Hafizabad", 
      "Kohat", "Jacobabad", "Shikarpur", "Muzaffargarh", "Khanpur", "Gojra", "Bahawalnagar", 
      "Muridke", "Pakpattan", "Abbottabad", "Tando Adam", "Khairpur", "Chishtian", "Daska", 
      "Mandi Bahauddin", "Kamalia", "Tando Allahyar", "Vehari", "Dera Ismail Khan", "Khuzdar", 
      "Wazirabad", "Nowshera", "Khushab", "Charsadda", "Jaranwala", "Mianwali", "Ghotki", 
      "Haripur", "Muzaffarabad", "Rawalakot", "Mirpur", "Gilgit", "Skardu", "Gwadar", "Turbat",
      "Bathinda", "Karnal", "Sonipat", "Anand", "Ludhiana"
    ]);
    CUSTOMERS.forEach(c => {
      if (c.city) cities.add(c.city);
      else {
        const addr = c.address || '';
        if (addr.includes('Bathinda')) cities.add('Bathinda');
        if (addr.includes('Karnal')) cities.add('Karnal');
        if (addr.includes('Sonipat')) cities.add('Sonipat');
        if (addr.includes('Anand')) cities.add('Anand');
        if (addr.includes('Ludhiana')) cities.add('Ludhiana');
      }
    });
    COMPANIES.forEach(co => {
      if (co.city) cities.add(co.city);
    });
    return Array.from(cities).filter(Boolean).sort();
  }, []);

  // Global Toast Notifications State
  const [toasts, setToasts] = useState([]);

  // Toast notification trigger
  const triggerNotificationToast = (title, message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };
  
  // Manual remove
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // Add Audit log helper
  const addAuditLog = (action, details) => {
    const newLog = {
      id: `A_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: currentUser.username,
      action,
      details
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Listen to keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Global Modal Scroll Lock
  useEffect(() => {
    const checkModals = () => {
      // Find any active modal by checking for the full-screen overlay class
      const hasModal = document.querySelector('.fixed.inset-0:not(.hidden)');
      if (hasModal) {
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
        document.body.style.setProperty('overflow', 'hidden', 'important');
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    };

    // Run initially
    checkModals();

    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    setIsLoggedIn(true);
    setActiveTab('pos');
    addAuditLog('User Login', `Session started for ${userObj.name} (${userObj.role})`);
  };

  const handleLogout = () => {
    addAuditLog('Logout', `Session ended for ${currentUser.name}`);
    setIsLoggedIn(false);
  };

  // Role permissions checking helper
  const hasAccess = (tab) => {
    const role = currentUser.role;
    
    // Admin has access to everything
    if (role === 'Admin') return true;

    // Manager can access most screens
    if (role === 'Manager') {
      return ['pos', 'sales', 'customers', 'products', 'categories', 'companies', 'offers', 'inventory', 'warehouse', 'purchase', 'purchase_return', 'cancel_purchase', 'suppliers', 'vendors', 'returns', 'cancel_sale', 'expenses', 'expense_categories', 'vendor_ledger', 'expense_ledger', 'general_ledger', 'reports', 'trial_balance', 'balance_sheet', 'settings', 'users', 'sales_report', 'purchase_report', 'stock_report', 'expense_report', 'customer_ledger', 'cashbook', 'return_history', 'account_details'].includes(tab);
    }

    // Cashier can access POS, Customers, Products, Inventory, Settings, Expenses, Returns, Cancel Sale
    if (role === 'Cashier') {
      return ['pos', 'customers', 'products', 'offers', 'inventory', 'settings', 'returns', 'cancel_sale', 'expenses', 'expense_categories', 'cashbook', 'account_details'].includes(tab);
    }

    // Storekeeper can only access products, inventory, warehouse
    if (role === 'Store Keeper') {
      return ['products', 'inventory', 'warehouse', 'purchase_return', 'cancel_purchase', 'settings'].includes(tab);
    }

    // Accounts can access customers, reports, settings, expenses, sales, returns
    if (role === 'Accounts') {
      return ['customers', 'reports', 'trial_balance', 'settings', 'expenses', 'expense_categories', 'vendor_ledger', 'expense_ledger', 'general_ledger', 'purchase_return', 'cancel_purchase', 'returns', 'cancel_sale', 'sales_report', 'purchase_report', 'stock_report', 'expense_report', 'customer_ledger', 'cashbook', 'return_history'].includes(tab);
    }

    return false;
  };

  if (!isLoggedIn) {
    return (
      <LoginScreen 
        onLoginSuccess={handleLoginSuccess} 
        triggerNotificationToast={triggerNotificationToast} 
      />
    );
  }

  return (
    <POSProvider triggerNotificationToast={triggerNotificationToast}>
      <div className="min-h-screen bg-gray-50 flex font-sans overflow-x-hidden">
        
        {/* Mobile Sidebar overlay backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[85] lg:hidden transition-opacity duration-300"
        ></div>
      )}

      {/* Sidebar fixed */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        currentUser={currentUser}
        handleLogout={handleLogout}
      />

      {/* Main body content area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full max-w-full min-w-0 overflow-hidden ${
          isSidebarCollapsed ? 'lg:pl-20 lg:pr-0' : 'lg:pl-64 lg:pr-0'
        }`}
      >
        {/* Header fixed */}
        <Header 
          currentUser={currentUser}
          isCollapsed={isSidebarCollapsed}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          addAuditLog={addAuditLog}
          unreadNotifications={unreadNotifications}
          setUnreadNotifications={setUnreadNotifications}
          triggerNotificationToast={triggerNotificationToast}
          setActiveTab={setActiveTab}
        />

        {/* Inner Content Scrollable */}
        <main className="flex-1 mt-16 p-4 sm:p-6 min-h-0 w-full max-w-full min-w-0 overflow-x-hidden">
          
          {/* Permission Gate validation */}
          {!hasAccess(activeTab) ? (
            <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto shadow-md text-center space-y-4 my-12 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{t('common.access_restricted', 'Access Restricted: Permission Denied')}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t('common.permission_warning', 'Your current active role does not have access permissions for the selected panel.')} (<strong className="text-red-600 font-bold capitalize">{currentUser.role}</strong>)
                </p>
              </div>
              <div className="bg-gray-50 border p-3 rounded-lg text-[11px] text-gray-500 font-medium">
                {t('common.role_switch_hint', 'To explore this page, use the Top-Right Profile Dropdown to switch your active session role.')}
              </div>
            </div>
          ) : (
            /* Render active tab screen */
            <>
              {activeTab === 'pos' && (
                <POSScreen 
                  currentUser={currentUser} 
                  addAuditLog={addAuditLog} 
                  triggerNotificationToast={triggerNotificationToast}
                  heldSales={heldSales}
                  setHeldSales={setHeldSales}
                  invoices={invoices}
                  setInvoices={setInvoices}
                />
              )}
              {activeTab === 'customers' && (
                <CustomersScreen 
                  invoices={invoices} 
                  addAuditLog={addAuditLog} 
                  triggerNotificationToast={triggerNotificationToast}
                  selectedCity={selectedCity}
                  setSelectedCity={setSelectedCity}
                  cities={allCities}
                />
              )}
              {activeTab === 'products' && <ProductsScreen triggerNotificationToast={triggerNotificationToast} addAuditLog={addAuditLog} />}
              {activeTab === 'offers' && <OffersScreen triggerNotificationToast={triggerNotificationToast} addAuditLog={addAuditLog} />}
              {activeTab === 'inventory' && <InventoryScreen triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} />}
              {activeTab === 'reports' && <ReportsScreen invoices={invoices} expenses={expenses} triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'trial_balance' && <TrialBalanceScreen invoices={invoices} expenses={expenses} dateFilter={dateFilter} setDateFilter={setDateFilter} />}
              {activeTab === 'balance_sheet' && <BalanceSheetScreen invoices={invoices} expenses={expenses} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} triggerNotificationToast={triggerNotificationToast} />}
              {activeTab === 'sales_report' && <ReportsScreen invoices={invoices} expenses={expenses} defaultTab="sales" triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'purchase_report' && <ReportsScreen invoices={invoices} expenses={expenses} defaultTab="purchase" triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'stock_report' && <ReportsScreen invoices={invoices} expenses={expenses} defaultTab="stock" triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'expense_report' && <ReportsScreen invoices={invoices} expenses={expenses} defaultTab="expense" triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'customer_ledger' && <CustomerLedgerScreen invoices={invoices} triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'vendor_ledger' && <VendorLedgerScreen triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'expense_ledger' && <ExpenseLedgerScreen expenses={expenses} setExpenses={setExpenses} triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} />}
              {activeTab === 'general_ledger' && <GeneralLedgerScreen invoices={invoices} expenses={expenses} triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'account_details' && (
                <AccountDetailsScreen
                  initialAccount={accountDetailsTarget}
                  invoices={invoices}
                  expenses={expenses}
                  triggerNotificationToast={triggerNotificationToast}
                />
              )}
              {activeTab === 'cashbook' && <ReportsScreen invoices={invoices} expenses={expenses} defaultTab="cashbook" triggerNotificationToast={triggerNotificationToast} dateFilter={dateFilter} setDateFilter={setDateFilter} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
              {activeTab === 'settings' && <SettingsScreen triggerNotificationToast={triggerNotificationToast} />}
              {activeTab === 'purchase' && (
                <PurchaseOrderScreen 
                  triggerNotificationToast={triggerNotificationToast} 
                  addAuditLog={addAuditLog} 
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  selectedCity={selectedCity}
                  setSelectedCity={setSelectedCity}
                  cities={allCities}
                />
              )}
              {(activeTab === 'suppliers' || activeTab === 'vendors') && (
                <SuppliersScreen 
                  selectedCity={selectedCity}
                  setSelectedCity={setSelectedCity}
                  cities={allCities}
                />
              )}
              {activeTab === 'returns' && (
                <SalesReturnScreen 
                  invoices={invoices} 
                  setInvoices={setInvoices}
                  onReturnSaved={refreshInvoices}
                  addAuditLog={addAuditLog}
                  triggerNotificationToast={triggerNotificationToast}
                  defaultTab="sales"
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}
              {activeTab === 'purchase_return' && (
                <SalesReturnScreen 
                  invoices={invoices} 
                  addAuditLog={addAuditLog}
                  triggerNotificationToast={triggerNotificationToast}
                  defaultTab="purchase"
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}
              {activeTab === 'return_history' && (
                <SalesReturnScreen 
                  invoices={invoices} 
                  addAuditLog={addAuditLog}
                  triggerNotificationToast={triggerNotificationToast}
                  defaultTab="history"
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}
              {activeTab === 'cancel_sale' && (
                <CancelSaleScreen 
                  currentUser={currentUser}
                  invoices={invoices} 
                  setInvoices={setInvoices}
                  addAuditLog={addAuditLog}
                  triggerNotificationToast={triggerNotificationToast}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}
              {activeTab === 'cancel_purchase' && (
                <CancelPurchaseScreen 
                  currentUser={currentUser}
                  addAuditLog={addAuditLog}
                  triggerNotificationToast={triggerNotificationToast}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}
              {(activeTab === 'expenses' || activeTab === 'expense_categories') && (
                <ExpensesScreen 
                  currentUser={currentUser}
                  expenses={expenses}
                  setExpenses={setExpenses}
                  invoices={invoices}
                  triggerNotificationToast={triggerNotificationToast}
                  defaultTab={activeTab === 'expense_categories' ? 'categories' : 'history'}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  onOpenAccountDetails={(target) => {
                    setAccountDetailsTarget(target);
                    setActiveTab('account_details');
                  }}
                />
              )}
              {activeTab === 'users' && (
                <UsersScreen 
                  currentUser={currentUser}
                  triggerNotificationToast={triggerNotificationToast}
                />
              )}
              {activeTab === 'warehouse' && (
                <WarehouseScreen 
                  currentUser={currentUser}
                  triggerNotificationToast={triggerNotificationToast}
                />
              )}
              {(activeTab === 'sales' || activeTab === 'sales_list') && (
                <SalesScreen 
                  invoices={invoices} 
                  setInvoices={setInvoices} 
                  triggerNotificationToast={triggerNotificationToast} 
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  selectedCity={selectedCity}
                  setSelectedCity={setSelectedCity}
                  cities={allCities}
                />
              )}
              {activeTab === 'categories' && <CategoriesScreen triggerNotificationToast={triggerNotificationToast} />}
              {activeTab === 'companies'  && <CompaniesScreen triggerNotificationToast={triggerNotificationToast} invoices={invoices} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={allCities} />}
            </>
          )}

        </main>
      </div>
    </div>
    
    {/* Global Toast Notifications Container */}
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const typeStyles = {
          success: 'bg-green-50 border-green-200 text-green-800',
          error: 'bg-red-50 border-red-200 text-red-800',
          warning: 'bg-amber-50 border-amber-200 text-amber-800',
          info: 'bg-blue-50 border-blue-200 text-blue-800'
        };
        const TypeIcon = {
          success: CheckCircle2,
          error: XCircle,
          warning: AlertTriangle,
          info: Info
        }[toast.type] || Info;

        return (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-start gap-3 p-4 min-w-[300px] max-w-sm rounded-xl border shadow-lg transform transition-all duration-300 translate-x-0 opacity-100 ${typeStyles[toast.type] || typeStyles.info}`}
            style={{ animation: 'slideInRight 0.3s ease-out' }}
          >
            <TypeIcon className={`mt-0.5 shrink-0 ${
              toast.type === 'success' ? 'text-green-600' :
              toast.type === 'error' ? 'text-red-600' :
              toast.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
            }`} size={18} />
            <div className="flex-1">
              <h4 className="text-sm font-bold">{toast.title}</h4>
              {toast.message && <p className="text-xs mt-0.5 opacity-80 leading-snug">{toast.message}</p>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer shrink-0">
              <X size={14} className="opacity-60" />
            </button>
          </div>
        );
      })}
    </div>
    
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}} />

    </POSProvider>
  );
}