import React, { useState } from 'react';
import { 
  UserCog, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2, 
  Lock, 
  Phone, 
  Mail, 
  Shield, 
  User, 
  AlertTriangle,
  Key
} from 'lucide-react';
import { USERS as INITIAL_USERS } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';

const ROLES = [
  { 
    name: 'Admin', 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    desc: 'Full unrestricted access to POS, Inventory, Financials, Settings & Users' 
  },
  { 
    name: 'Manager', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    desc: 'Access to sales, purchase orders, products, inventory, customers & reports' 
  },
  { 
    name: 'Cashier', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    desc: 'Terminal POS access, billing invoices, customer lookup & daily drawer closing' 
  },
  { 
    name: 'Store Keeper', 
    color: 'bg-amber-100 text-amber-800 border-amber-200', 
    desc: 'Product catalog management, batch stock inward & inventory audits' 
  },
  { 
    name: 'Accounts', 
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200', 
    desc: 'Financial ledger statements, expenses tracking, sales & tax reporting' 
  },
];

export default function UsersScreen({ currentUser, triggerNotificationToast }) {
  const { t } = useLanguage();
  const [usersList, setUsersList] = useState([
    ...INITIAL_USERS.map(u => ({
      ...u,
      email: u.email || `${u.username}@agroerp.com`,
      phone: u.phone || '9876500000',
      status: u.status || 'Active',
      lastLogin: u.lastLogin || '2026-07-28 10:15 AM'
    }))
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    email: '',
    role: 'Cashier',
    passcode: '1234',
    status: 'Active'
  });

  const [formError, setFormError] = useState('');

  // Handle Open Add User Modal
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      phone: '',
      email: '',
      role: 'Cashier',
      passcode: '1234',
      status: 'Active'
    });
    setFormError('');
    setShowAddModal(true);
  };

  // Handle Open Edit User Modal
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      phone: user.phone,
      email: user.email,
      role: user.role,
      passcode: user.passcode || '1234',
      status: user.status
    });
    setFormError('');
    setShowAddModal(true);
  };

  // Save User (Add or Edit)
  const handleSaveUser = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.username.trim()) {
      setFormError('Please fill in Name and Username.');
      return;
    }

    if (editingUser) {
      // Update existing
      setUsersList(usersList.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      if (triggerNotificationToast) {
        triggerNotificationToast('User Updated', `Updated profile & role for ${formData.name}`, 'success');
      }
    } else {
      // Check username duplicate
      if (usersList.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
        setFormError('Username already exists. Please choose a different username.');
        return;
      }

      const newUser = {
        id: `U_${Date.now()}`,
        ...formData,
        lastLogin: 'Never'
      };
      setUsersList([...usersList, newUser]);
      if (triggerNotificationToast) {
        triggerNotificationToast('User Created', `Added ${newUser.name} as ${newUser.role}`, 'success');
      }
    }

    setShowAddModal(false);
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setUsersList(usersList.map(u => u.id === id ? { ...u, status: nextStatus } : u));
    if (triggerNotificationToast) {
      triggerNotificationToast('Status Changed', `User status updated to ${nextStatus}`, 'info');
    }
  };

  // Delete User
  const handleDeleteUser = (id, name) => {
    if (id === currentUser?.id || id === 'U_ADM') {
      alert('Cannot delete current active logged-in Super Admin account.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      setUsersList(usersList.filter(u => u.id !== id));
      if (triggerNotificationToast) {
        triggerNotificationToast('User Deleted', `Removed ${name}`, 'info');
      }
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = !searchQuery || 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
            <UserCog size={24} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">User Accounts & Role Permissions</h1>
            <p className="text-xs text-gray-500 font-medium">Manage POS counter operators, assign roles (Admin, Cashier, Manager) & security passcodes</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Add New User</span>
        </button>
      </div>

      {/* User List Table Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
        
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user by name, username, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold focus:border-green-500 focus:outline-none bg-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:outline-none"
          >
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>

          {(searchQuery || roleFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setRoleFilter(''); }}
              className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Passcode</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <User size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">No users found matching search.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const roleObj = ROLES.find(r => r.name === user.role) || ROLES[1];
                  const isActive = user.status === 'Active';
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 text-green-800 font-extrabold flex items-center justify-center text-xs shadow-xs">
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{user.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium block">{user.phone}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-gray-700">{user.username}</td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${roleObj.color}`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-gray-500">
                        <span className="tracking-widest">••••</span> ({user.passcode || '1234'})
                      </td>

                      <td className="py-3 px-4 text-[11px] text-gray-500 font-medium whitespace-nowrap">
                        {user.lastLogin}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            isActive 
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          <span>{user.status}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit User Details & Role"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete User"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400">
          Total Registered Users: {usersList.length}
        </div>

      </div>

      {/* ADD / EDIT USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck size={20} className="text-green-600" />
                <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">
                  {editingUser ? `Edit Account (${editingUser.username})` : 'Create New User Account'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Singh"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Username *</label>
                  <input
                    type="text"
                    placeholder="e.g. ramesh"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Security Passcode (4 Digits)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={formData.passcode}
                    onChange={e => setFormData({ ...formData, passcode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-gray-800 focus:border-green-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              {/* Assign Role (Admin / Cashier / Manager / etc.) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Assign System Role <span className="text-green-600">(Role Access Control)</span>
                </label>
                <div className="grid grid-cols-1 gap-2 border border-gray-200 rounded-xl p-3 bg-gray-50 max-h-48 overflow-y-auto">
                  {ROLES.map(r => (
                    <label 
                      key={r.name} 
                      className={`flex items-start space-x-3 p-2 rounded-lg border transition cursor-pointer ${
                        formData.role === r.name ? 'bg-white border-green-500 shadow-xs' : 'border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="userRole"
                        value={r.name}
                        checked={formData.role === r.name}
                        onChange={() => setFormData({ ...formData, role: r.name })}
                        className="mt-0.5 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className="font-extrabold text-gray-900 block">{r.name}</span>
                        <span className="text-[10px] text-gray-500 leading-tight block">{r.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Account Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none bg-white"
                >
                  <option value="Active">Active (Can log in & perform POS actions)</option>
                  <option value="Inactive">Inactive (Account locked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>{editingUser ? 'Save Changes' : 'Create User Account'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
