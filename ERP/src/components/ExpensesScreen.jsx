import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingDown, 
  PlusCircle, 
  Tag, 
  History, 
  Search, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  Trash2, 
  Edit3, 
  PieChart, 
  ArrowDownRight,
  FolderPlus,
  Receipt,
  Wallet,
  Printer,
  FileSpreadsheet,
  FileText as FileTextIcon,
  X
} from 'lucide-react';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import PrintHeader from './PrintHeader';
import { useLanguage } from '../context/LanguageContext';
import { expenseApi } from '../api';
import { getConfiguredBanks, addConfiguredBank, getConfiguredWallets, addConfiguredWallet, getSupportedAccounts, addDetailedAccount } from '../utils/accountUtils';

const INITIAL_CATEGORIES = [];

export default function ExpensesScreen({
  currentUser,
  expenses = [],
  setExpenses,
  triggerNotificationToast,
  defaultTab = 'history',
  dateFilter,
  setDateFilter,
  invoices = [],
  purchaseOrders = [],
  customerPayments = [],
  vendorPayments = [],
  onOpenAccountDetails
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  useEffect(() => {
    const fetchExpenseData = async () => {
      try {
        const catRes = await expenseApi.getCategories();
        if (catRes && Array.isArray(catRes)) setCategories(catRes);
        const expRes = await expenseApi.getAll();
        if (expRes && Array.isArray(expRes)) setExpenses(expRes);
      } catch (e) {}
    };
    fetchExpenseData();
  }, []);

  // Form State for Add Expense
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: INITIAL_CATEGORIES[0]?.name || '',
    amount: '',
    payment_method: 'Cash',
    bank_name: '',
    wallet_name: '',
    date: new Date().toISOString().split('T')[0],
    ref_no: '',
    notes: '',
    status: 'Paid'
  });

  const [supportedAccounts, setSupportedAccounts] = useState(getSupportedAccounts());
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccType, setNewAccType] = useState('Bank');
  const [newAccName, setNewAccName] = useState('');
  const [newAccProvider, setNewAccProvider] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');

  // Form State for Add Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddCatModal, setShowAddCatModal] = useState(false);

  // Filters for History
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddNewAccountSubmit = (e) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    // Add comprehensive detailed account
    addDetailedAccount({
      accountName: newAccName.trim(),
      type: newAccType,
      providerName: newAccProvider.trim(),
      accountNumber: newAccNumber.trim()
    });

    if (newAccType === 'Bank') {
       addConfiguredBank(newAccName.trim());
    } else if (newAccType === 'Mobile Wallet') {
       addConfiguredWallet(newAccName.trim());
    }
    
    const updatedSupported = getSupportedAccounts();
    setSupportedAccounts(updatedSupported);
    setExpenseForm(prev => ({ ...prev, payment_method: newAccName.trim() }));
    setShowAddAccountModal(false);
    setNewAccName('');
    setNewAccProvider('');
    setNewAccNumber('');
    if (triggerNotificationToast) {
       triggerNotificationToast('Account Added', `${newAccName.trim()} has been successfully created.`, 'success');
    }
  };

  // Handle Add Expense Submit
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!expenseForm.title.trim()) {
      setErrorMsg('Please enter an expense title.');
      return;
    }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }

    let finalPaymentMethod = expenseForm.payment_method;

    const newEntry = {
      title: expenseForm.title.trim(),
      category: expenseForm.category || (categories[0]?.name || 'Miscellaneous'),
      amount: parseFloat(expenseForm.amount),
      payment_method: finalPaymentMethod,
      date: expenseForm.date,
      ref_no: expenseForm.ref_no.trim() || 'N/A',
      notes: expenseForm.notes.trim() || '—',
      user: currentUser?.name || 'Admin',
      status: expenseForm.status
    };

    try {
      const created = await expenseApi.create(newEntry);
      setExpenses([created || newEntry, ...expenses]);
      setSuccessMsg(`Expense "${newEntry.title}" of Rs. ${newEntry.amount.toLocaleString()} added successfully!`);
      
      if (triggerNotificationToast) {
        triggerNotificationToast('Expense Added', `Rs. ${newEntry.amount.toLocaleString()} - ${newEntry.title}`, 'success');
      }

      // Reset Form
      setExpenseForm({
        title: '',
        category: categories[0]?.name || 'Miscellaneous',
        amount: '',
        payment_method: 'Cash',
        bank_name: '',
        date: new Date().toISOString().split('T')[0],
        ref_no: '',
        notes: '',
        status: 'Paid'
      });

      setTimeout(() => setActiveTab('history'), 800);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add expense.');
    }
  };

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const catObj = await expenseApi.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || 'Custom expense category'
      });
      setCategories(prev => [...prev, catObj || { id: `CAT_${Date.now()}`, name: newCatName.trim() }]);
      setNewCatName('');
      setNewCatDesc('');
      setShowAddCatModal(false);

      if (activeTab === 'add') {
        setExpenseForm(prev => ({ ...prev, category: newCatName.trim() }));
      }

      if (triggerNotificationToast) {
        triggerNotificationToast('Category Created', `Added category "${newCatName.trim()}"`, 'success');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create expense category.');
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete expense "${title}"?`)) {
      try {
        await expenseApi.delete(id);
        setExpenses(expenses.filter(e => e._id !== id && e.id !== id));
        if (triggerNotificationToast) {
          triggerNotificationToast('Expense Removed', `Deleted ${title}`, 'info');
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to delete expense.');
      }
    }
  };

  const dateFilteredExpenses = useMemo(() => {
    return expenses.filter(e => isItemInDateRange(e.date, dateFilter.startDate, dateFilter.endDate));
  }, [expenses, dateFilter]);

  // Computed Metrics
  const totalExpenseAmount = useMemo(() => {
    return dateFilteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [dateFilteredExpenses]);

  const categoryTotals = useMemo(() => {
    const map = {};
    dateFilteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [dateFilteredExpenses]);

  const filteredExpenses = useMemo(() => {
    return dateFilteredExpenses.filter(e => {
      const matchesQuery = !searchQuery || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.ref_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.user.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !selectedCategoryFilter || e.category === selectedCategoryFilter;
      const matchesPay = !selectedPaymentFilter || e.payment_method === selectedPaymentFilter;
      return matchesQuery && matchesCat && matchesPay;
    });
  }, [dateFilteredExpenses, searchQuery, selectedCategoryFilter, selectedPaymentFilter]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Voucher No', 'Title', 'Category', 'Paid From Account', 'Status', 'Amount', 'Recorded By', 'Notes'];
    const csvRows = [headers.join(',')];
    filteredExpenses.forEach(exp => {
      const row = [
        exp.date,
        exp.id,
        `"${exp.title.replace(/"/g, '""')}"`,
        `"${exp.category}"`,
        `"${exp.payment_method}"`,
        exp.status,
        exp.amount,
        `"${exp.user}"`,
        `"${(exp.notes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="min-w-0">
          <h1 className="text-lg font-black text-gray-900 tracking-tight">
            {activeTab === 'categories' ? t('expense_categories', 'Expense Categories') : t('expenses', 'Expenses Management')}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">
            {activeTab === 'categories' 
              ? 'Manage and group expenses for better budget tracking & financial reporting'
              : 'Record shop operational expenses, track category budgets & payment receipts'
            }
          </p>
        </div>

        {activeTab !== 'categories' && (
          <button
            onClick={() => setActiveTab('add')}
            className="shrink-0 flex items-center justify-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>{t('add_new_expense', 'Add New Expense')}</span>
          </button>
        )}
      </div>

      {/* ADD ACCOUNT MODAL */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-green-600">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Add Payment Account</h3>
                  <p className="text-xs text-gray-500 font-medium">Create a new bank or mobile wallet</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddAccountModal(false)}
                className="p-2 bg-white rounded-xl text-gray-400 hover:text-red-500 shadow-sm transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewAccountSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Account Name <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="e.g. HBL Account"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:border-green-500 focus:outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Account Type <span className="text-red-500">*</span></label>
                <select 
                  value={newAccType}
                  onChange={e => setNewAccType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Mobile Wallet">Mobile Wallet</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Bank / Wallet Name</label>
                <input 
                  type="text"
                  placeholder="e.g. HBL / JazzCash"
                  value={newAccProvider}
                  onChange={e => setNewAccProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-green-500 focus:outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Account Number</label>
                <input 
                  type="text"
                  placeholder="e.g. 0987654321"
                  value={newAccNumber}
                  onChange={e => setNewAccNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-green-500 focus:outline-none transition"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddAccountModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-md shadow-green-500/20 cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Filter Bar */}
      <div className="no-print">
        <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />
      </div>

      {/* Main Tab Navigation */}
      {activeTab !== 'categories' && (
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-100 p-1 rounded-xl w-fit text-xs font-bold no-print">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={14} />
          <span>{t('expense_history', 'Expense History')} ({expenses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'add' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PlusCircle size={14} />
          <span>{t('add_new_expense', 'Add Expense')}</span>
        </button>
      </div>
      )}

      {/* TAB 1: ADD EXPENSE FORM */}
      {activeTab === 'add' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl mx-auto space-y-5 animate-in zoom-in-95 duration-150">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <PlusCircle size={18} className="text-green-600" />
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">Record New Expense Entry</h2>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddExpenseSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                Expense Title / Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Shop Electricity Bill July 2026"
                value={expenseForm.title}
                onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseForm.category}
                  onChange={e => {
                    if (e.target.value === '__NEW__') {
                      setShowAddCatModal(true);
                    } else {
                      setExpenseForm({ ...expenseForm, category: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__NEW__" className="text-blue-600 font-bold">+ Add New Category...</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Amount (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Paid From Account <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={expenseForm.payment_method}
                    onChange={e => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition"
                  >
                    {supportedAccounts.map(acc => (
                      <option key={acc.id} value={acc.name}>{acc.label}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setShowAddAccountModal(true)}
                    className="flex-shrink-0 p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition border border-green-200 cursor-pointer"
                    title="Add New Account"
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={expenseForm.status}
                  onChange={e => setExpenseForm({ ...expenseForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Ref / Voucher No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. VOUCH-001"
                  value={expenseForm.ref_no}
                  onChange={e => setExpenseForm({ ...expenseForm, ref_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                Notes / Particulars
              </label>
              <textarea
                rows={3}
                placeholder="Additional comments or payment voucher particulars..."
                value={expenseForm.notes}
                onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium text-gray-800 focus:border-green-500 focus:outline-none transition"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Save Expense Entry</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: EXPENSE CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Expense Categories List</h2>
              <p className="text-xs text-gray-500">Group expenses for budget tracking & financial reporting</p>
            </div>
            <button
              onClick={() => setShowAddCatModal(true)}
              className="flex items-center space-x-1 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <FolderPlus size={14} />
              <span>Add Category</span>
            </button>
          </div>

          {/* Categories Grid */}
          {categories.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 font-medium">
              <Tag size={32} className="mx-auto mb-2 text-gray-300" />
              No expense categories created yet. Click "Add Category" above to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map(cat => {
                const spent = categoryTotals[cat.name] || 0;
                const count = expenses.filter(e => e.category === cat.name).length;
                return (
                  <div key={cat.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${cat.color}`}>
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{count} items</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed min-h-[36px]">{cat.description}</p>
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Total Spent</span>
                      <span className="text-sm font-black text-gray-900">Rs. {spent.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}


        </div>
      )}

      {/* TAB 3: EXPENSE HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-0 animate-in fade-in duration-150 printable-area">
          
          {/* Export Actions (No Print) */}
          <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center no-print">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">Expense Records</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold transition">
                <FileSpreadsheet size={14} /> Export CSV
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition">
                <FileTextIcon size={14} /> Export PDF
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold transition">
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-3 no-print">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search expense title, ref no, user..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:border-green-500 focus:outline-none bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:outline-none transition"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>

              <select
                value={selectedPaymentFilter}
                onChange={e => setSelectedPaymentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white text-gray-800 focus:border-green-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">All Paid From Accounts</option>
                {getSupportedAccounts().map(acc => (
                  <option key={acc.id} value={acc.name}>{acc.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (onOpenAccountDetails) {
                    onOpenAccountDetails(selectedPaymentFilter || 'Cash');
                  }
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
                title="Open right-side drawer for detailed account statement, summary cards & transaction history"
              >
                <Wallet size={14} />
                <span>Account Details</span>
              </button>

              {(searchQuery || selectedCategoryFilter || selectedPaymentFilter) && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategoryFilter(''); setSelectedPaymentFilter(''); }}
                  className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* ── PRINT VIEW EXACT LAYOUT ── */}
          <div className="hidden print:block p-8 font-sans text-[11px] text-black bg-white w-full">
            <PrintHeader title="Expense History Report" subtitle="Store(s): Main Store" />

            <table className="w-full text-left border-collapse mb-1">
              <thead>
                <tr className="border-y border-black font-bold">
                  <th className="py-2 font-bold">Date</th>
                  <th className="py-2 font-bold">Voucher No</th>
                  <th className="py-2 font-bold">Expense Title</th>
                  <th className="py-2 font-bold">Category</th>
                  <th className="py-2 font-bold">Paid From</th>
                  <th className="py-2 font-bold text-center">Status</th>
                  <th className="py-2 font-bold text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp, idx) => (
                  <tr key={idx} className="border-b border-gray-200/50">
                    <td className="py-2">{exp.date}</td>
                    <td className="py-2">{exp.id}</td>
                    <td className="py-2 font-semibold">{exp.title}</td>
                    <td className="py-2">{exp.category}</td>
                    <td className="py-2">{exp.payment_method}</td>
                    <td className="py-2 text-center">{exp.status}</td>
                    <td className="py-2 text-right">{exp.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2 border-t border-black mt-2">
              <div className="w-1/2 flex justify-between pl-10 pr-1 text-[13px] font-bold">
                <span>Total Amount:</span>
                <span>Rs. {filteredExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Table - Fits 100% on screen without horizontal scrollbar */}
          <div className="w-full overflow-hidden no-print">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-2 sm:px-3">Date</th>
                  <th className="py-3 px-2 sm:px-3">Voucher No</th>
                  <th className="py-3 px-2.5 sm:px-4">Expense Title</th>
                  <th className="py-3 px-2 sm:px-3">Category</th>
                  <th className="py-3 px-2 sm:px-3">Paid From Account</th>
                  <th className="py-3 px-2 sm:px-3 text-center">Status</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Amount</th>
                  <th className="py-3 px-2 sm:px-3">Recorded By</th>
                  <th className="py-3 px-2 sm:px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="font-semibold">No expense records found matching criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-2 sm:px-3 text-gray-500 font-medium text-[11px]">{exp.date}</td>
                      <td className="py-3 px-2 sm:px-3 font-mono font-bold text-gray-700 text-[11px]">{exp.id}</td>
                      <td className="py-3 px-2.5 sm:px-4 font-bold text-gray-900">
                        <div className="line-clamp-1">{exp.title}</div>
                        {exp.notes && exp.notes !== '—' && (
                          <div className="text-[10px] text-gray-400 font-normal line-clamp-1">{exp.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 truncate max-w-[120px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-3 font-semibold text-gray-600 text-[11px]">{exp.payment_method}</td>
                      <td className="py-3 px-2 sm:px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          exp.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          exp.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {exp.status || 'Paid'}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-3 text-right font-black text-red-600 text-xs">
                        Rs. {exp.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 sm:px-3 font-medium text-gray-500 text-[11px] truncate max-w-[100px]">{exp.user}</td>
                      <td className="py-3 px-2 sm:px-3 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                          title="Delete expense entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400 flex justify-between items-center no-print">
            <span>Showing {filteredExpenses.length} of {expenses.length} expenses</span>
            <span className="font-bold text-gray-700">Subtotal: Rs. {filteredExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
          </div>

        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible !important; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; max-width: 100%; max-height: none; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Add Category Modal (Accessible from any tab) */}
      {showAddCatModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-extrabold text-gray-800">Create New Expense Category</h3>
              <button onClick={() => setShowAddCatModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddCategorySubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Marketing & Advertising"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief details about what this category covers..."
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-medium text-gray-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-4 py-2 border text-gray-600 rounded-xl font-bold cursor-pointer hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
