import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { getPresetRange } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

export default function DateFilterBar({ dateFilter, setDateFilter, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const { preset, startDate, endDate } = dateFilter;
  const [isCityOpen, setIsCityOpen] = useState(false);
  const cityRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setIsCityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [cityRef]);

  const handlePresetChange = (newPreset) => {
    if (newPreset === 'Custom') {
      setDateFilter({
        preset: 'Custom',
        startDate: startDate || '',
        endDate: endDate || ''
      });
    } else {
      const range = getPresetRange(newPreset);
      setDateFilter({
        preset: newPreset,
        startDate: range.start,
        endDate: range.end
      });
    }
  };

  const handleCustomDateChange = (type, val) => {
    const updated = {
      ...dateFilter,
      preset: 'Custom',
      [type]: val
    };
    setDateFilter(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 border border-green-200 text-green-700 rounded-xl">
          <Calendar size={18} />
        </div>
        <div>
          <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">{t('date_location_filters', 'Date & Location Filters')}</h4>
          <p className="text-[10px] text-gray-400 font-medium">
            {preset === 'All Time' 
              ? t('showing_all_records', 'Showing all time records') 
              : `Range: ${startDate || 'Start'} to ${endDate || 'End'}`}
            {selectedCity && selectedCity !== 'All' && ` • City: ${selectedCity}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* City Filter select dropdown */}
        {setSelectedCity && (
          <div className="relative" ref={cityRef}>
            <button
              type="button"
              onClick={() => setIsCityOpen(!isCityOpen)}
              className="w-full md:w-44 pl-3 pr-8 rtl:pl-8 rtl:pr-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-750 hover:border-green-500 focus:border-green-500 focus:outline-none transition cursor-pointer flex justify-between items-center text-left rtl:text-right"
            >
              <span className="truncate">{selectedCity === 'All' ? t('all_cities', 'All Cities') : selectedCity}</span>
              <span className="text-gray-400 text-[10px] absolute right-3 rtl:right-auto rtl:left-3">▼</span>
            </button>
            
            {isCityOpen && (
              <div className="absolute left-0 rtl:left-auto rtl:right-0 mt-1 w-full md:w-44 bg-white border border-gray-200 shadow-lg rounded-lg py-1 max-h-40 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-100 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => { setSelectedCity('All'); setIsCityOpen(false); }}
                  className={`w-full text-left rtl:text-right px-3 py-1.5 text-xs font-bold hover:bg-gray-50 transition cursor-pointer ${selectedCity === 'All' ? 'bg-green-50 text-green-700 font-extrabold' : 'text-gray-750'}`}
                >
                  {t('all_cities', 'All Cities')}
                </button>
                {cities.map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => { setSelectedCity(city); setIsCityOpen(false); }}
                    className={`w-full text-left rtl:text-right px-3 py-1.5 text-xs font-bold hover:bg-gray-50 transition cursor-pointer ${selectedCity === city ? 'bg-green-50 text-green-700 font-extrabold' : 'text-gray-750'}`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preset Select dropdown */}
        <div className="relative">
          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full md:w-48 pl-3 pr-8 rtl:pl-8 rtl:pr-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition cursor-pointer appearance-none"
          >
            <option value="All Time">📁 {t('all_time', 'All Time')}</option>
            <option value="Today">📅 {t('today', 'Today')}</option>
            <option value="Yesterday">📅 {t('yesterday', 'Yesterday')}</option>
            <option value="This Week">📅 {t('this_week', 'This Week')}</option>
            <option value="This Month">📅 {t('this_month', 'This Month')}</option>
            <option value="Custom">⚙️ {t('custom_range', 'Custom Date Range')}</option>
          </select>
          <div className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-2.5 rtl:pl-2.5 pointer-events-none text-gray-500 text-[10px]">
            ▼
          </div>
        </div>

        {/* Custom Date Pickers */}
        {preset === 'Custom' && (
          <div className="flex items-center gap-2 animate-in zoom-in-95 duration-150">
            <div className="relative">
              <span className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400 uppercase">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                className="pl-12 pr-2.5 rtl:pl-2.5 rtl:pr-12 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 focus:border-green-500 focus:outline-none transition"
              />
            </div>
            <ArrowRight size={12} className="text-gray-400 rtl:rotate-180" />
            <div className="relative">
              <span className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400 uppercase">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                className="pl-9 pr-2.5 rtl:pl-2.5 rtl:pr-9 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 focus:border-green-500 focus:outline-none transition"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
