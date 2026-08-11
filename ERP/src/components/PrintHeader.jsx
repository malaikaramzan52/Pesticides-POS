import React from 'react';
import { getStoredData } from '../utils/mockData';

export default function PrintHeader({ title, dateRange = '', subtitle = '' }) {
  const defaultShopInfo = {
    name: 'Punjab Pesticides & Agro Wholesale Depot',
    owner: 'Harpreet Singh & Sons',
    phone: '9876543210',
    email: 'info@punjabpesticides.com',
    address: 'Shop No. 45, Grain Market Road, Sector 3, Bathinda, Punjab 151001',
    website: 'www.punjabpesticides.com'
  };

  const shopInfo = getStoredData('AGRO_ERP_SHOP_INFO', defaultShopInfo);

  return (
    <div className="flex justify-between items-start mb-6 border-b border-black pb-4 font-sans text-black">
      <div>
        <div className="text-[18px] font-black uppercase tracking-wider leading-tight">{shopInfo.name}</div>
        <div className="mt-1 text-[12px] font-bold text-gray-800">{shopInfo.address}</div>
        <div className="mt-1 text-[11px]">
          <span className="font-semibold">Phone:</span> {shopInfo.phone} 
          {shopInfo.email && <span className="ml-2"><span className="font-semibold">Email:</span> {shopInfo.email}</span>}
        </div>
        <div className="mt-5 text-[15px] font-bold uppercase tracking-widest">{title}</div>
        {subtitle && <div className="mt-1 text-[12px] font-semibold text-gray-700">{subtitle}</div>}
      </div>
      <div className="text-right flex flex-col items-end">
        {dateRange && dateRange !== 'All Time' && (
          <div className="text-[11px] font-bold border border-black px-2 py-1 rounded bg-gray-50 uppercase tracking-wider mb-2">
            {dateRange}
          </div>
        )}
        <div className="text-[10px] text-gray-600 mt-auto">Page 1 of 1</div>
        <div className="text-[10px] text-gray-600">Printed: {new Date().toLocaleString('en-GB')}</div>
      </div>
    </div>
  );
}
