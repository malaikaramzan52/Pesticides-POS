import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  Boxes, 
  Truck, 
  RotateCcw, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Tag,
  Building2,
  BadgeDollarSign,
  Receipt,
  UserCog,
  ShoppingBag,
  TrendingDown,
  Warehouse,
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Wallet,
  Ban,
  Files,
  Scale,
  PieChart
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

const MENU_CATEGORIES = [
  {
    id: 'sales_group',
    label: 'Sales',
    icon: ShoppingCart,
    children: [
      { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
      { id: 'sales', label: 'Sales', icon: Receipt },
      { id: 'returns', label: 'Sale Return', icon: RotateCcw },
      { id: 'cancel_sale', label: 'Cancel Sale', icon: Ban },
    ]
  },
  {
    id: 'products_group',
    label: 'Products',
    icon: Package,
    children: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'categories', label: 'Categories', icon: Tag },
      { id: 'companies', label: 'Companies', icon: Building2 },
      { id: 'offers', label: 'Offers / Schemes', icon: Tag },
      { id: 'inventory', label: 'Inventory', icon: Boxes },
      { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
    ]
  },
  {
    id: 'purchases_group',
    label: 'Purchases',
    icon: ShoppingBag,
    children: [
      { id: 'purchase', label: 'Purchase Orders', icon: ShoppingBag },
      { id: 'purchase_return', label: 'Purchase Return', icon: RotateCcw },
      { id: 'cancel_purchase', label: 'Cancel Purchase', icon: Ban },
      { id: 'vendors', label: 'Vendors', icon: Truck },
    ]
  },
  {
    id: 'customers_group',
    label: 'Customers',
    icon: Users,
    children: [
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'customer_ledger', label: 'Customer Ledger', icon: BookOpen },
    ]
  },
  {
    id: 'finance_group',
    label: 'Finance',
    icon: BadgeDollarSign,
    children: [
      { id: 'expenses', label: 'Expenses', icon: TrendingDown },
      { id: 'expense_categories', label: 'Expense Categories', icon: Tag },
      { id: 'cashbook', label: 'Cash Drawer Book', icon: Wallet },
    ]
  },
  {
    id: 'accounts_group',
    label: 'Accounts',
    icon: Files,
    children: [
      { id: 'vendor_ledger', label: 'Supplier Ledger', icon: BookOpen },
      { id: 'expense_ledger', label: 'Expense Ledger', icon: BookOpen },
      { id: 'general_ledger', label: 'Journal Ledger', icon: BookOpen },
      { id: 'account_details', label: 'Account Details', icon: Files },
    ]
  },
  {
    id: 'reports_group',
    label: 'Reports',
    icon: BarChart3,
    children: [
      { id: 'sales_report', label: 'Sales Report', icon: TrendingUp },
      { id: 'purchase_report', label: 'Purchase Report', icon: ShoppingBag },
      { id: 'stock_report', label: 'Stock Report', icon: Boxes },
      { id: 'expense_report', label: 'Expense Report', icon: TrendingDown },
      { id: 'return_history', label: 'Return History', icon: RotateCcw },
      { id: 'trial_balance', label: 'Trial Balance', icon: Scale },
      { id: 'balance_sheet', label: 'Balance Sheet', icon: PieChart },
    ]
  },
  {
    id: 'admin_group',
    label: 'Administration',
    icon: SettingsIcon,
    children: [
      { id: 'users', label: 'Users', icon: UserCog },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ]
  }
];

export default function Sidebar({ activeTab, onTabChange, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, currentUser, handleLogout }) {
  const { t, isRTL } = useLanguage();
  const [openMenus, setOpenMenus] = useState({});
  const [openSubMenus, setOpenSubMenus] = useState({});

  const toggleMenu = (label) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const toggleSubMenu = (label) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside 
      className={`bg-white border-r border-gray-200 h-screen flex flex-col justify-between transition-all duration-300 shadow-xl z-[90] fixed left-0 top-0 lg:translate-x-0 ${
        isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
      } ${
        isCollapsed ? 'lg:w-20' : 'lg:w-64'
      } w-64`}
    >
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-green-500 to-green-400 p-2 rounded-xl text-white shadow-md shadow-green-500/20">
                <Boxes size={22} />
              </div>
              <div>
                <span className="font-black text-gray-800 tracking-wider text-lg block">AGRO<span className="text-green-600">POS</span></span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto bg-gradient-to-tr from-green-500 to-green-400 p-2 rounded-xl text-white shadow-md shadow-green-500/20">
              <Boxes size={22} />
            </div>
          )}
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto scrollbar-none max-h-[calc(100vh-10rem)]">
          {MENU_CATEGORIES.map((category) => {
            const CategoryIcon = category.icon;
            
            if (!category.children) {
              const isActive = activeTab === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => { onTabChange(category.id); }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 group text-left relative overflow-hidden ${
                    isActive ? 'bg-green-100 text-green-800 font-bold shadow-sm' : 'text-gray-500 hover:bg-green-50 hover:text-green-700'
                  }`}
                  title={isCollapsed ? category.label : undefined}
                >
                  <CategoryIcon size={20} className={`relative z-10 transition-transform duration-300 ${isActive ? 'text-green-700 scale-110' : 'text-gray-400 group-hover:text-green-600 group-hover:scale-110'}`} />
                  {!isCollapsed && <span className="text-sm tracking-wide relative z-10">{t(category.id, category.label)}</span>}
                  {isActive && <div className="absolute inset-0 border-l-4 border-green-600 rounded-xl rounded-l-none"></div>}
                </button>
              );
            }

            const hasActiveChild = category.children.some(child => 
              child.id === activeTab || (child.children && child.children.some(sc => sc.id === activeTab))
            );
            const isOpen = openMenus[category.label] !== undefined ? openMenus[category.label] : (hasActiveChild || category.id === 'accounts_group');

            return (
              <div key={category.label} className="space-y-1">
                <button
                  onClick={() => toggleMenu(category.label)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 group text-left ${
                    hasActiveChild && !isOpen ? 'bg-green-50 text-green-700 font-bold border border-green-100 shadow-sm' : 'text-gray-500 hover:bg-green-50/70 hover:text-green-700'
                  }`}
                  title={isCollapsed ? t(category.id, category.label) : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <CategoryIcon size={20} className={`transition-transform duration-300 ${hasActiveChild ? 'text-green-600' : 'text-gray-400 group-hover:text-green-600 group-hover:scale-110'}`} />
                    {!isCollapsed && <span className="text-sm tracking-wide">{t(category.id, category.label)}</span>}
                  </div>
                  {!isCollapsed && (isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400 group-hover:text-green-600 transition-colors" />)}
                </button>
                
                {isOpen && !isCollapsed && (
                  <div className="pl-4 rtl:pl-0 rtl:pr-4 space-y-1 mt-1">
                    {category.children.map((child) => {
                      const ChildIcon = child.icon;

                      if (child.children) {
                        const isSubOpen = openSubMenus[child.label];
                        const hasActiveSubChild = child.children.some(sc => sc.id === activeTab);
                        return (
                          <div key={child.label} className="space-y-1">
                            <button
                              onClick={() => toggleSubMenu(child.label)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group text-left ${
                                hasActiveSubChild && !isSubOpen ? 'text-green-700 font-bold bg-green-50' : 'text-gray-500 hover:text-green-700 hover:bg-green-50/50'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {ChildIcon && <ChildIcon size={18} className={hasActiveSubChild ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'} />}
                                <span className="text-sm">{t(child.id, child.label)}</span>
                              </div>
                              {isSubOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400 group-hover:text-green-500" />}
                            </button>
                            {isSubOpen && (
                              <div className="pl-6 rtl:pl-0 rtl:pr-6 space-y-1 mt-1 border-l rtl:border-l-0 rtl:border-r border-green-100 ml-4 rtl:ml-0 rtl:mr-4 py-1">
                                {child.children.map(subChild => {
                                  const isSubChildActive = activeTab === subChild.id;
                                  const SubChildIcon = subChild.icon;
                                  return (
                                    <button
                                      key={subChild.id}
                                      onClick={() => { setActiveTab(subChild.id); setIsMobileOpen(false); }}
                                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-left relative ${
                                        isSubChildActive ? 'text-green-800 font-bold bg-green-100' : 'text-gray-500 hover:text-green-700 hover:bg-green-50'
                                      }`}
                                    >
                                      {isSubChildActive && <div className="absolute left-0 rtl:left-auto rtl:right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-green-600 rounded-r-full rtl:rounded-r-none rtl:rounded-l-full shadow-[0_0_8px_rgba(22,163,74,0.4)]"></div>}
                                      {SubChildIcon && <SubChildIcon size={14} className={isSubChildActive ? 'text-green-700' : 'text-gray-400'} />}
                                      <span className="text-xs tracking-wide">{t(subChild.id, subChild.label)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const isChildActive = activeTab === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => { onTabChange(child.id); }}
                          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-left relative ${
                            isChildActive ? 'bg-green-100 text-green-800 font-bold' : 'text-gray-500 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          {isChildActive && <div className="absolute left-0 rtl:left-auto rtl:right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-green-600 rounded-r-full rtl:rounded-r-none rtl:rounded-l-full shadow-[0_0_8px_rgba(22,163,74,0.4)]"></div>}
                          <ChildIcon size={18} className={isChildActive ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'} />
                          <span className="text-sm tracking-wide">{t(child.id, child.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className={`p-4 border-t border-gray-100 bg-white/95 backdrop-blur-md flex ${isCollapsed ? 'flex-col items-center space-y-3' : 'flex-row items-center justify-between space-x-3'}`}>
        <button
          onClick={handleLogout}
          className={`flex-1 flex items-center ${isCollapsed ? 'justify-center w-10 h-10' : 'space-x-3 px-4 py-2.5'} rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-all duration-200 text-left font-bold border border-transparent`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!isCollapsed && <span className="text-sm tracking-wide">{t('logout', 'Logout')}</span>}
        </button>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex items-center justify-center p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 border border-gray-200 bg-gray-50 shadow-sm ${isCollapsed ? 'w-10 h-10 mt-2' : ''}`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
        </button>
      </div>
    </aside>
  );
}
