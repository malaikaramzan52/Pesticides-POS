import React, { useState } from 'react';
import { 
  Boxes, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight
} from 'lucide-react';
import { USERS } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';

import { authApi } from '../api';

export default function LoginScreen({ onLoginSuccess, triggerNotificationToast }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('0000');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg(t('missing_creds', 'Please enter both username and password.'));
      return;
    }

    try {
      const res = await authApi.login(password.trim(), username.trim());
      if (res.token) {
        localStorage.setItem('agro_pos_token', res.token);
      }
      onLoginSuccess(res.user || { username: username.trim(), name: 'Admin User', role: 'Admin' });
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Check your passcode.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      
      {/* Subtle Background Accent Blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Brand Header */}
        <div className="bg-green-600 p-8 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
            <Boxes size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase">AGRO-ERP POS</h1>
          <p className="text-xs text-green-100 mt-1 font-medium">{t('wholesaler_retailer_system', 'Wholesale & Retail Pesticides Management System')}</p>
        </div>

        {/* Login Form Body */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-5">
          
          <div className="space-y-1 text-center">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t('sign_in_title', 'Sign In to Counter Terminal')}</h2>
            <p className="text-xs text-gray-500">{t('sign_in_desc', 'Enter your cashier or manager credentials to continue')}</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-semibold text-center">
              {errorMsg}
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t('username_label', 'Username')}</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                placeholder={t('username_placeholder', 'Enter username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t('password_label', 'Password')}</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={t('password_placeholder', 'Enter password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Login Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{t('login_btn', 'Login to POS Terminal')}</span>
            <ArrowRight size={16} />
          </button>



        </form>

        {/* Footer info */}
        <div className="bg-gray-50 p-3 text-center border-t border-gray-100 text-[10px] text-gray-400 font-medium">
          Bathinda Main Branch • Counter Register Terminal A
        </div>

      </div>
    </div>
  );
}
