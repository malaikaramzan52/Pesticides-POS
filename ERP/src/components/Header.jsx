import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  ShieldAlert,
  Menu,
  Calendar,
  Clock,
  X,
  Calculator,
  Delete,
  CornerDownLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getStoredData, PRODUCTS } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';
import { productApi } from '../api';

export default function Header({ 
  currentUser, 
  isCollapsed,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  addAuditLog,
  unreadNotifications,
  setUnreadNotifications,
  triggerNotificationToast,
  setActiveTab
}) {
  const { t } = useLanguage();
  const [showNotificationsList, setShowNotificationsList] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcFormula, setCalcFormula] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const notificationRef = useRef(null);
  const calculatorRef = useRef(null);
  const calendarRef = useRef(null);

  const [liveNotifications, setLiveNotifications] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);

  // Fetch live products from database to check for low stock and expiry
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productApi.getAll();
        if (data && Array.isArray(data)) {
          setDbProducts(data);
        }
      } catch (e) {}
    };
    fetchProducts();
    const interval = setInterval(fetchProducts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Generate real notifications based on live database products
  useEffect(() => {
    const newNotifs = [];
    let idCounter = 1;

    dbProducts.forEach(p => {
      let totalStock = 0;
      if (p.batches) {
        p.batches.forEach(b => {
          totalStock += (b.stock_qty || 0);
          
          // Expiry check
          if (b.expiry_date) {
            const exp = new Date(b.expiry_date);
            const now = new Date();
            const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
            if (diffDays < 0 && (b.stock_qty || 0) > 0) {
              newNotifs.push({ id: idCounter++, title: 'Expired Product', text: `${p.name} (Batch: ${b.batch_no || 'DEFAULT'}) is expired!`, type: 'error', tab: 'inventory' });
            } else if (diffDays >= 0 && diffDays <= 30 && (b.stock_qty || 0) > 0) {
              newNotifs.push({ id: idCounter++, title: 'Near Expiry', text: `${p.name} (Batch: ${b.batch_no || 'DEFAULT'}) expires in ${Math.ceil(diffDays)} days.`, type: 'warning', tab: 'inventory' });
            }
          }
        });
      }
      
      // Low stock check
      if (totalStock <= 0) {
        newNotifs.push({ id: idCounter++, title: 'Out of Stock', text: `${p.name} is completely out of stock!`, type: 'error', tab: 'inventory' });
      } else if (totalStock <= (p.min_stock || 15)) {
        newNotifs.push({ id: idCounter++, title: 'Low Stock', text: `${p.name} is running low (${totalStock} left).`, type: 'warning', tab: 'inventory' });
      }
      
      if (p.damaged_qty && p.damaged_qty > 0) {
        newNotifs.push({ id: idCounter++, title: 'Damaged Stock', text: `${p.name} has ${p.damaged_qty} damaged items.`, type: 'error', tab: 'inventory' });
      }
    });

    setLiveNotifications(newNotifs);
    setUnreadNotifications(newNotifs.length);
  }, [dbProducts]);

  // Live ticking clock for Navbar
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close notifications panel and calculator on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationsList(false);
      }
      if (calculatorRef.current && !calculatorRef.current.contains(event.target)) {
        setShowCalculator(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calendar logic
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(currentYear, currentMonth + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Calculator button handler
  const handleCalcClick = (val) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcFormula('');
      return;
    }

    if (val === 'DEL') {
      if (calcDisplay.length > 1 && calcDisplay !== 'Error') {
        setCalcDisplay(prev => prev.trimEnd().slice(0, -1).trimEnd() || '0');
      } else {
        setCalcDisplay('0');
      }
      return;
    }

    if (val === '=') {
      try {
        const expr = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
        // Safe evaluation
        const result = Function(`"use strict"; return (${expr})`)();
        setCalcFormula(calcDisplay + ' =');
        setCalcDisplay(String(Number(result.toFixed(4))));
      } catch {
        setCalcDisplay('Error');
      }
      return;
    }

    if (['+', '-', '×', '÷', '%'].includes(val)) {
      if (calcDisplay === 'Error') return;
      setCalcDisplay(prev => `${prev} ${val} `);
      return;
    }

    setCalcDisplay(prev => (prev === '0' || prev === 'Error' ? val : prev + val));
  };

  const handleNotificationClick = (notif) => {
    if (setActiveTab && notif.tab) {
      setActiveTab(notif.tab);
    }
    setShowNotificationsList(false);
  };

  return (
    <header 
      className={`bg-white border-b border-gray-200 h-16 fixed top-0 right-0 left-0 flex items-center justify-between px-4 sm:px-6 z-40 transition-all duration-300 ${
        isCollapsed ? 'lg:left-20' : 'lg:left-64'
      }`}
    >
      {/* Mobile Drawer Trigger Menu */}
      <div className="flex items-center space-x-3">
        <button 
          type="button"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition mr-1 lg:hidden border border-gray-200 cursor-pointer"
        >
          <Menu size={18} />
        </button>

        {/* Live Date & Time Display in Navbar */}
        <div className="hidden md:flex items-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-green-700 font-bold">
            <Calendar size={14} />
            <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center space-x-1.5 text-gray-800 font-mono font-bold">
            <Clock size={14} className="text-gray-500" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Right Side: Calculator, Calendar, Notification Bell & Profile Session info */}
      <div className="flex items-center space-x-2 sm:space-x-4">

        {/* ── Calendar Button & Popup ──────────────────────────────────── */}
        <div className="relative" ref={calendarRef}>
          <button 
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="p-2 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition cursor-pointer flex items-center space-x-1 border border-transparent hover:border-green-200"
            title="Open Calendar"
          >
            <Calendar size={20} />
          </button>

          {/* Draggable/Floating Calendar Popup */}
          {showCalendar && (
            <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-3 sm:w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100] overflow-hidden p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2 text-gray-800 font-extrabold text-xs">
                  <Calendar size={16} className="text-green-600" />
                  <span>Calendar</span>
                </div>
                <button 
                  onClick={() => setShowCalendar(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Calendar Body */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition cursor-pointer">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-bold text-gray-800">{monthNames[currentMonth]} {currentYear}</span>
                  <button onClick={nextMonth} className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition cursor-pointer">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {dayNames.map(d => (
                    <span key={d} className="text-[10px] font-bold text-gray-500">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-1.5" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = day === currentTime.getDate() && currentMonth === currentTime.getMonth() && currentYear === currentTime.getFullYear();
                    return (
                      <button 
                        key={day} 
                        className={`p-1.5 text-xs rounded-lg transition cursor-pointer ${
                          isToday 
                            ? 'bg-green-600 text-white font-bold shadow-md' 
                            : 'text-gray-700 hover:bg-green-50 hover:text-green-700 font-medium'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Calculator Button & Popup ──────────────────────────────────── */}
        <div className="relative" ref={calculatorRef}>
          <button 
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className="p-2 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition cursor-pointer flex items-center space-x-1 border border-transparent hover:border-green-200"
            title="Open Quick Calculator"
          >
            <Calculator size={20} />
          </button>

          {/* Draggable/Floating Calculator Popup */}
          {showCalculator && (
            <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-3 sm:w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100] overflow-hidden p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2 text-gray-800 font-extrabold text-xs">
                  <Calculator size={16} className="text-green-600" />
                  <span>Quick Calculator</span>
                </div>
                <button 
                  onClick={() => setShowCalculator(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Display Screen */}
              <div className="bg-gray-900 text-white rounded-xl p-3 text-right space-y-0.5 font-mono shadow-inner border border-gray-800">
                <span className="text-[10px] text-gray-400 block h-4 overflow-hidden truncate">{calcFormula}</span>
                <span className="text-xl font-bold tracking-wider block overflow-x-auto scrollbar-none">{calcDisplay}</span>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold font-mono">
                <button onClick={() => handleCalcClick('C')} className="p-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl transition cursor-pointer">C</button>
                <button onClick={() => handleCalcClick('DEL')} className="p-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition cursor-pointer flex items-center justify-center">⌫</button>
                <button onClick={() => handleCalcClick('%')} className="p-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition cursor-pointer">%</button>
                <button onClick={() => handleCalcClick('÷')} className="p-2.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-xl transition cursor-pointer font-bold">÷</button>

                <button onClick={() => handleCalcClick('7')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">7</button>
                <button onClick={() => handleCalcClick('8')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">8</button>
                <button onClick={() => handleCalcClick('9')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">9</button>
                <button onClick={() => handleCalcClick('×')} className="p-2.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-xl transition cursor-pointer font-bold">×</button>

                <button onClick={() => handleCalcClick('4')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">4</button>
                <button onClick={() => handleCalcClick('5')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">5</button>
                <button onClick={() => handleCalcClick('6')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">6</button>
                <button onClick={() => handleCalcClick('-')} className="p-2.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-xl transition cursor-pointer font-bold">-</button>

                <button onClick={() => handleCalcClick('1')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">1</button>
                <button onClick={() => handleCalcClick('2')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">2</button>
                <button onClick={() => handleCalcClick('3')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">3</button>
                <button onClick={() => handleCalcClick('+')} className="p-2.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-xl transition cursor-pointer font-bold">+</button>

                <button onClick={() => handleCalcClick('0')} className="col-span-2 p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">0</button>
                <button onClick={() => handleCalcClick('.')} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition cursor-pointer">.</button>
                <button onClick={() => handleCalcClick('=')} className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition cursor-pointer shadow-sm font-extrabold">=</button>
              </div>

            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => {
              setShowNotificationsList(!showNotificationsList);
              setUnreadNotifications(0);
            }}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition relative cursor-pointer"
            title="Notifications"
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center font-bold border border-white">
                {unreadNotifications}
              </span>
            )}
          </button>

          {showNotificationsList && (
            <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-3 sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Alerts & Notifications</span>
                <button onClick={() => setShowNotificationsList(false)} className="text-gray-400 hover:text-gray-600 p-0.5">
                  <X size={14} />
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {liveNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 font-medium">No new notifications</div>
                ) : (
                  liveNotifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      className="p-3.5 hover:bg-gray-50/80 transition cursor-pointer"
                    >
                      <div className="flex items-start space-x-3">
                        <ShieldAlert size={16} className={`mt-0.5 shrink-0 ${notif.type === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 hover:text-green-600 transition">{notif.title}</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{notif.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Session Profile */}
        <div className="flex items-center space-x-2.5 p-1.5 rounded-lg border border-transparent select-none">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs shadow">
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-bold text-gray-800 block leading-tight">{currentUser.name}</span>
            <span className="text-[10px] text-green-600 font-semibold tracking-wide uppercase leading-none block mt-0.5">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
