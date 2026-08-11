import React, { useState, useMemo, useEffect } from 'react';
import { 
  Warehouse as WarehouseIcon, 
  Package, 
  ArrowLeftRight, 
  Download, 
  Boxes, 
  History, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Building2, 
  ArrowRight, 
  Calendar, 
  MapPin,
  Tag,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCcw,
  Check,
  Eye,
  X,
  FileText
} from 'lucide-react';
import { PRODUCTS, COMPANIES, CATEGORIES, UNITS, getStoredData, setStoredData, saveProductsToStorage, getWarehouseStock, INITIAL_WAREHOUSE_STOCK } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';
import { warehouseApi } from '../api';



// Initial Transfer History
const INITIAL_TRANSFERS = [];

// Helper to ensure all products from master catalog exist in Warehouse Stock
const buildAllWarehouseStock = (storedStock) => {
  const stockList = Array.isArray(storedStock) && storedStock.length > 0 ? [...storedStock] : [...INITIAL_WAREHOUSE_STOCK];
  
  PRODUCTS.forEach(p => {
    const co = COMPANIES.find(c => c.id === p.company_id);
    const compName = co ? `${co.name} (${co.company_type || 'Manufacturer'})` : 'Agro Corp';
    const catName = CATEGORIES.find(c => c.id === p.category_id)?.name || 'Pesticides';
    const unitName = UNITS.find(u => u.id === p.unit_id)?.name || 'Unit';

    const pBatches = (p.batches && p.batches.length > 0) 
      ? p.batches 
      : [{ id: `B_${p.id}_1`, batch_no: 'DEFAULT', stock_qty: 0, mfg_date: '2026-01-01', expiry_date: '2028-12-31', purchase_rate: p.dealer_price || 100, selling_rate: p.farmer_price || 150 }];

    pBatches.forEach(b => {
      const exists = stockList.some(item => 
        item.product_id === p.id && (item.batch_no === b.batch_no || item.code === p.code)
      );
      if (!exists) {
        stockList.push({
          id: `WH_${p.id}_${b.id || b.batch_no}`,
          product_id: p.id,
          product_name: p.name,
          code: p.code,
          category: catName,
          company: compName,
          batch_no: b.batch_no,
          mfg_date: b.mfg_date || '2026-01-01',
          expiry_date: b.expiry_date || '2028-12-31',
          rack_no: 'Bay 04 - Main Godown',
          warehouse_qty: b.stock_qty || 0,
          pos_counter_qty: b.stock_qty || 0,
          unit: unitName,
          purchase_rate: b.purchase_rate || p.dealer_price || 100,
          selling_rate: b.selling_rate || p.farmer_price || 150
        });
      }
    });
  });

  return stockList;
};

// ── Vendor Information Helper for Warehouse Products ─────────────────────────
const getVendorDetailsForProduct = (item) => {
  if (!item) return null;
  const comp = (item.company || '').toLowerCase();
  const found = COMPANIES.find(c => comp.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(comp));
  if (found) {
    return {
      name: found.name,
      contact: found.contact_person || 'Supplier Representative',
      phone: found.phone || 'N/A',
      city: found.city || 'Regional Depot',
      email: found.email || 'N/A'
    };
  }
  return {
    name: item.company || 'Supplier / Manufacturer',
    contact: 'Supplier Representative',
    phone: 'N/A',
    city: 'Regional Depot',
    email: 'N/A'
  };
};

export default function WarehouseScreen({ currentUser, triggerNotificationToast }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'transfer', 'history'
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [transfersHistory, setTransfersHistory] = useState([]);

  useEffect(() => {
    const fetchWarehouseData = async () => {
      try {
        const stockRes = await warehouseApi.getStock();
        if (stockRes && Array.isArray(stockRes) && stockRes.length > 0) {
          setWarehouseStock(stockRes);
        } else {
          const saved = getWarehouseStock();
          setWarehouseStock(buildAllWarehouseStock(saved));
        }
        const trfRes = await warehouseApi.getTransfers();
        if (trfRes && Array.isArray(trfRes)) setTransfersHistory(trfRes);
      } catch (e) {
        const saved = getWarehouseStock();
        setWarehouseStock(buildAllWarehouseStock(saved));
      }
    };
    fetchWarehouseData();
  }, [activeTab]);

  // Filters & Search State for Product List & Transfer History
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeCard, setActiveCard] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Popup Modal State for Direct "Transfer to Inventory Stock"
  const [transferModalItem, setTransferModalItem] = useState(null);
  const [viewProductItem, setViewProductItem] = useState(null);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [modalQty, setModalQty] = useState('');
  const [modalDestination, setModalDestination] = useState('Counter A Register (Bathinda H.O.)');
  const [modalHandledBy, setModalHandledBy] = useState(currentUser?.name || 'Karan Singh (Store Keeper)');
  const [modalNotes, setModalNotes] = useState('');
  const [modalError, setModalError] = useState('');

  // Handle opening pop-up modal for a specific product item
  const handleOpenTransferModal = (item) => {
    setTransferModalItem(item);
    setSelectedStockId(item.id);
    setModalQty('');
    setModalDestination('Counter A Register (Bathinda H.O.)');
    setModalHandledBy(currentUser?.name || 'Karan Singh (Store Keeper)');
    setModalNotes('');
    setModalError('');
  };

  // Batches for the selected product in modal
  const allProductBatches = useMemo(() => {
    if (!transferModalItem) return [];
    return warehouseStock.filter(s => 
      s.product_id === transferModalItem.product_id || 
      s.product_name.toLowerCase() === transferModalItem.product_name.toLowerCase()
    );
  }, [warehouseStock, transferModalItem]);

  // Active stock item selected inside modal
  const activeModalStockItem = useMemo(() => {
    if (!transferModalItem) return null;
    return warehouseStock.find(s => s.id === selectedStockId) || transferModalItem;
  }, [warehouseStock, transferModalItem, selectedStockId]);

  // Handle Transfer Stock submission inside Pop-up Modal
  const handleConfirmModalTransfer = () => {
    setModalError('');
    if (!activeModalStockItem) return;

    const qty = parseInt(modalQty);
    if (!qty || qty <= 0) {
      setModalError('Please enter a valid transfer quantity (> 0).');
      return;
    }

    if (qty > activeModalStockItem.warehouse_qty) {
      setModalError(`Transfer quantity (${qty}) exceeds available warehouse stock (${activeModalStockItem.warehouse_qty}).`);
      return;
    }

    // 1. Deduct from Warehouse, Add to POS Counter Qty
    const updatedStock = warehouseStock.map(item => {
      if (item.id === activeModalStockItem.id) {
        return {
          ...item,
          warehouse_qty: item.warehouse_qty - qty,
          pos_counter_qty: item.pos_counter_qty + qty
        };
      }
      return item;
    });

    setWarehouseStock(updatedStock);
    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedStock);

    // 2. Automatically sync with global PRODUCTS array (which updates POS Screen, Products Screen, and Inventory Screen)
    const targetProd = PRODUCTS.find(p => 
      p.id === activeModalStockItem.product_id || 
      p.code === activeModalStockItem.code || 
      p.name.toLowerCase() === activeModalStockItem.product_name.toLowerCase()
    );

    if (targetProd) {
      if (!targetProd.batches || targetProd.batches.length === 0) {
        targetProd.batches = [{ id: `B_${Date.now()}`, batch_no: activeModalStockItem.batch_no || 'DEFAULT', stock_qty: 0 }];
      }
      const targetBatch = targetProd.batches.find(b => b.batch_no === activeModalStockItem.batch_no) || targetProd.batches[0];
      targetBatch.stock_qty = (targetBatch.stock_qty || 0) + qty;
      saveProductsToStorage();
    }

    // 3. Record Stock Transfer History entry
    const newTransferRecord = {
      id: `TRF-2026-${String(transfersHistory.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'Transfer to POS',
      product_name: activeModalStockItem.product_name,
      batch_no: activeModalStockItem.batch_no,
      source: `Main Warehouse (${activeModalStockItem.rack_no || 'Godown'})`,
      destination: modalDestination,
      qty: qty,
      unit: activeModalStockItem.unit,
      handled_by: modalHandledBy || currentUser?.name || 'Store Keeper',
      notes: modalNotes || 'Direct stock dispatch via Product Catalog modal',
      status: 'Completed'
    };

    const updatedHistory = [newTransferRecord, ...transfersHistory];
    setTransfersHistory(updatedHistory);
    setStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', updatedHistory);

    const msg = `Successfully transferred ${qty} ${activeModalStockItem.unit} of "${activeModalStockItem.product_name}" to POS Counter & Inventory!`;
    setAlertSuccess(`✅ ${msg}`);

    if (triggerNotificationToast) {
      triggerNotificationToast('Stock Transferred to POS', `${qty} units added to POS Counter & Inventory`, 'success');
    }

    setTransferModalItem(null);
    setModalQty('');
    setModalNotes('');
  };

  // Form State: Transfer Stock to Inventory/POS
  const [transferForm, setTransferForm] = useState({
    selectedStockId: INITIAL_WAREHOUSE_STOCK[0]?.id || '',
    destination: 'Counter A Register (Bathinda H.O.)',
    qty: '',
    notes: '',
    handledBy: currentUser?.name || 'Store Keeper'
  });

  // Form State: Receive Stock from Purchases
  const [receiveForm, setReceiveForm] = useState({
    supplier: COMPANIES[0]?.name || '',
    productName: PRODUCTS[0]?.name || '',
    category: CATEGORIES[0]?.name || '',
    batchNo: '',
    mfgDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    rackNo: 'Rack A-01',
    qtyReceived: '',
    purchaseRate: PRODUCTS[0]?.batches?.[0]?.purchase_rate || '',
    sellingRate: PRODUCTS[0]?.batches?.[0]?.selling_rate || '',
    unit: 'Litre',
    poReference: ''
  });

  // Alerts & Messages
  const [alertSuccess, setAlertSuccess] = useState('');
  const [alertError, setAlertError] = useState('');

  // ─── Filtered Warehouse Product List ──────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return warehouseStock.filter(item => {
      const matchesSearch = !searchQuery || 
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batch_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.rack_no.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !selectedCategory || item.category === selectedCategory;
      const matchesCard = activeCard === 'Low Warehouse Stock Batches' ? item.warehouse_qty < 100 : true;
      return matchesSearch && matchesCat && matchesCard;
    });
  }, [warehouseStock, searchQuery, selectedCategory, activeCard]);

  // ─── Computed Warehouse Metrics ────────────────────────────────────────────────
  const totalWarehouseQty = useMemo(() => {
    return warehouseStock.reduce((sum, item) => sum + item.warehouse_qty, 0);
  }, [warehouseStock]);

  const totalWarehouseValue = useMemo(() => {
    return warehouseStock.reduce((sum, item) => sum + (item.warehouse_qty * item.purchase_rate), 0);
  }, [warehouseStock]);

  const lowStockCount = useMemo(() => {
    return warehouseStock.filter(item => item.warehouse_qty < 100).length;
  }, [warehouseStock]);

  // ─── Handle Transfer Stock Submission ──────────────────────────────────────────
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    setAlertError(''); setAlertSuccess('');

    const targetStockItem = warehouseStock.find(i => i.id === transferForm.selectedStockId);
    if (!targetStockItem) {
      setAlertError('Selected product batch not found in warehouse.');
      return;
    }

    const transferQty = parseInt(transferForm.qty);
    if (!transferQty || transferQty <= 0) {
      setAlertError('Please enter a valid transfer quantity (> 0).');
      return;
    }

    if (transferQty > targetStockItem.warehouse_qty) {
      setAlertError(`Transfer quantity (${transferQty}) exceeds available warehouse stock (${targetStockItem.warehouse_qty}).`);
      return;
    }

    // 1. Deduct from Warehouse, Add to POS Counter Qty
    const updatedStock = warehouseStock.map(item => {
      if (item.id === targetStockItem.id) {
        return {
          ...item,
          warehouse_qty: item.warehouse_qty - transferQty,
          pos_counter_qty: item.pos_counter_qty + transferQty
        };
      }
      return item;
    });

    setWarehouseStock(updatedStock);
    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedStock);

    // 2. Automatically sync with global PRODUCTS array (which updates POS Screen, Products Screen, and Inventory Screen)
    const targetProd = PRODUCTS.find(p => 
      p.id === targetStockItem.product_id || 
      p.code === targetStockItem.code || 
      p.name.toLowerCase() === targetStockItem.product_name.toLowerCase()
    );

    if (targetProd) {
      if (!targetProd.batches || targetProd.batches.length === 0) {
        targetProd.batches = [{ id: `B_${Date.now()}`, batch_no: targetStockItem.batch_no || 'DEFAULT', stock_qty: 0 }];
      }
      const targetBatch = targetProd.batches.find(b => b.batch_no === targetStockItem.batch_no) || targetProd.batches[0];
      targetBatch.stock_qty = (targetBatch.stock_qty || 0) + transferQty;
      saveProductsToStorage();
    }

    // 3. Record Stock Transfer History entry
    const newTransferRecord = {
      id: `TRF-2026-${String(transfersHistory.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'Transfer to POS',
      product_name: targetStockItem.product_name,
      batch_no: targetStockItem.batch_no,
      source: `Main Warehouse (${targetStockItem.rack_no})`,
      destination: transferForm.destination,
      qty: transferQty,
      unit: targetStockItem.unit,
      handled_by: transferForm.handledBy,
      notes: transferForm.notes || 'Routine stock dispatch to POS counter',
      status: 'Completed'
    };

    const updatedHistory = [newTransferRecord, ...transfersHistory];
    setTransfersHistory(updatedHistory);
    setStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', updatedHistory);

    const msg = `Successfully transferred ${transferQty} ${targetStockItem.unit} of "${targetStockItem.product_name}" to POS Counter & Inventory!`;
    setAlertSuccess(`✅ ${msg}`);

    if (triggerNotificationToast) {
      triggerNotificationToast('Stock Transferred to POS', `${transferQty} units added to POS Counter & Inventory`, 'success');
    }

    setTransferForm({
      ...transferForm,
      qty: '',
      notes: ''
    });

    setTimeout(() => setActiveTab('history'), 900);
  };

  // ─── Handle Receive Stock from Purchases Submission ────────────────────────────
  const handleReceiveStockSubmit = (e) => {
    e.preventDefault();
    setAlertError(''); setAlertSuccess('');

    const qty = parseInt(receiveForm.qtyReceived);
    if (!qty || qty <= 0) {
      setAlertError('Please enter a valid received quantity (> 0).');
      return;
    }

    const currentStock = getWarehouseStock();
    let updatedWarehouseStock = JSON.parse(JSON.stringify(currentStock));

    // Check if product already exists in warehouse stock
    const existingIndex = updatedWarehouseStock.findIndex(item => 
      (item.product_name && item.product_name.toLowerCase() === receiveForm.productName.toLowerCase()) ||
      (item.batch_no && item.batch_no.toLowerCase() === receiveForm.batchNo.toLowerCase())
    );

    if (existingIndex >= 0) {
      const prevQty = parseInt(updatedWarehouseStock[existingIndex].warehouse_qty) || 0;
      updatedWarehouseStock[existingIndex] = {
        ...updatedWarehouseStock[existingIndex],
        warehouse_qty: prevQty + qty,
        purchase_rate: parseFloat(receiveForm.purchaseRate) || updatedWarehouseStock[existingIndex].purchase_rate,
        selling_rate: parseFloat(receiveForm.sellingRate) || updatedWarehouseStock[existingIndex].selling_rate
      };
    } else {
      // Add new stock entry to warehouse
      const newStockEntry = {
        id: `WH_P_NEW_${Date.now()}`,
        product_id: `P_${Date.now()}`,
        product_name: receiveForm.productName,
        code: `P-REC-${Math.floor(100 + Math.random() * 900)}`,
        category: receiveForm.category,
        company: receiveForm.supplier,
        batch_no: receiveForm.batchNo,
        mfg_date: receiveForm.mfgDate,
        expiry_date: receiveForm.expiryDate,
        rack_no: receiveForm.rackNo,
        warehouse_qty: qty,
        pos_counter_qty: 0,
        unit: receiveForm.unit,
        purchase_rate: parseFloat(receiveForm.purchaseRate) || 100,
        selling_rate: parseFloat(receiveForm.sellingRate) || 150
      };
      updatedWarehouseStock.unshift(newStockEntry);
    }

    setWarehouseStock(updatedWarehouseStock);
    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedWarehouseStock);
    saveProductsToStorage();

    // Record Stock Inward Transfer History entry
    const newInwardRecord = {
      id: `TRF-2026-${String(transfersHistory.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'Purchase Inward',
      product_name: receiveForm.productName,
      batch_no: receiveForm.batchNo,
      source: `${receiveForm.supplier} (${receiveForm.poReference})`,
      destination: `Main Warehouse (${receiveForm.rackNo})`,
      qty: qty,
      unit: receiveForm.unit,
      handled_by: currentUser?.name || 'Store Keeper',
      notes: `Received purchase shipment from ${receiveForm.supplier}`,
      status: 'Completed'
    };

    setTransfersHistory([newInwardRecord, ...transfersHistory]);

    setAlertSuccess(`✅ Successfully received ${qty} units of "${receiveForm.productName}" (Batch: ${receiveForm.batchNo}) into Warehouse!`);

    if (triggerNotificationToast) {
      triggerNotificationToast('Purchase Stock Received', `${qty} units added to Warehouse ${receiveForm.rackNo}`, 'success');
    }

    setReceiveForm({
      ...receiveForm,
      qtyReceived: '',
      batchNo: `B-${Math.floor(1000 + Math.random() * 9000)}`
    });

    setTimeout(() => setActiveTab('products'), 900);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
            <WarehouseIcon size={24} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Godown & Warehouse Central Management</h1>
            <p className="text-xs text-gray-500 font-medium">Manage bulk inventory storage, dispatch transfers to POS counters & receive purchase shipments</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {warehouseStock.length > 0 && (
            <button
              onClick={() => handleOpenTransferModal(warehouseStock[0])}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              title="Click to open stock transfer modal"
            >
              <ArrowLeftRight size={15} />
              <span>Transfer Stock to POS</span>
            </button>
          )}
        </div>
      </div>

      {/* Warehouse Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Warehouse Stock Units', value: totalWarehouseQty.toLocaleString(), sub: `${warehouseStock.length} Active Product Batches`, icon: Boxes, color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-200', ring: 'ring-gray-200', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Total Storage Stock Valuation', value: `Rs. ${totalWarehouseValue.toLocaleString()}`, sub: 'Calculated at Wholesale Cost', icon: Building2, color: 'text-green-700', bg: 'bg-white', border: 'border-gray-200', ring: 'ring-green-500', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
          { label: 'Low Warehouse Stock Batches', value: `${lowStockCount} Batches`, sub: 'Stock quantity < 100 units', icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-white', border: 'border-gray-200', ring: 'ring-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
        ].map(({ label, value, sub, icon: Icon, color, bg, border, ring, iconBg, iconColor }) => {
          const isActive = activeCard === label || (activeCard === '' && label === 'Total Warehouse Stock Units');
          return (
            <div 
              key={label}
              onClick={() => setActiveCard(isActive ? '' : (label === 'Low Warehouse Stock Batches' ? label : ''))}
              className={`${bg} border ${border} ${isActive ? `ring-2 ring-opacity-20 ${ring} border-opacity-100` : ''} rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-sm hover:-translate-y-0.5`}
            >
              <div>
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">{label}</span>
                <span className={`text-2xl font-black mt-1 block ${color}`}>{value}</span>
                <span className="text-[10px] text-gray-500 font-semibold">{sub}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap border-b border-gray-200 bg-gray-100 p-1 rounded-xl w-fit text-xs font-bold text-gray-600">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
          }`}
        >
          <Package size={14} />
          <span>Warehouse Product List & Available Qty ({warehouseStock.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'history' ? 'bg-white text-purple-700 shadow-sm' : 'hover:text-gray-900'
          }`}
        >
          <History size={14} />
          <span>Stock Transfer History ({transfersHistory.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: WAREHOUSE PRODUCT LIST & AVAILABLE QUANTITY ───────────────── */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-0 animate-in fade-in duration-150">
          
          {/* Filter / Search Bar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search product name, code, batch no, rack..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
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
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Batch & Location</th>
                  <th className="py-3 px-4 text-right">Warehouse Stock</th>
                  <th className="py-3 px-4 text-right">POS Counter Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                      <Boxes size={32} className="mx-auto mb-2 opacity-40" />
                      <p>No products found in Warehouse matching criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(item => {
                    const isLow = item.warehouse_qty < 100;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition">
                        {/* 1. Product Details */}
                        <td className="py-3 px-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-gray-900">{item.product_name}</span>
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
                                isLow ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                              }`}>
                                {isLow ? 'Low Stock' : 'Available'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-medium mt-0.5">
                              <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{item.code}</span>
                              <span>•</span>
                              <span>{item.category}</span>
                              <span>•</span>
                              <span>{item.company}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Batch & Storage Location */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-emerald-700 text-xs">{item.batch_no}</span>
                              <span className="text-[10px] text-gray-400">(Exp: {item.expiry_date})</span>
                            </div>
                            <span className="inline-flex items-center space-x-1 text-[10px] text-gray-500 font-semibold">
                              <MapPin size={10} className="text-gray-400" />
                              <span>{item.rack_no}</span>
                            </span>
                          </div>
                        </td>

                        {/* 3. Available Warehouse Stock */}
                        <td className="py-3 px-4 text-right font-black text-gray-900 text-sm whitespace-nowrap">
                          <span className={isLow ? 'text-amber-600' : 'text-green-700'}>
                            {item.warehouse_qty.toLocaleString()} {item.unit}
                          </span>
                        </td>

                        {/* 4. POS Counter Stock */}
                        <td className="py-3 px-4 text-right font-bold text-gray-600 whitespace-nowrap">
                          {item.pos_counter_qty.toLocaleString()} {item.unit}
                        </td>

                        {/* 5. Actions: Transfer Icon + View Details Icon */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            {/* Transfer Icon Button */}
                            <button
                              onClick={() => handleOpenTransferModal(item)}
                              className="w-8 h-8 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer"
                              title="Transfer to Inventory Stock"
                            >
                              <ArrowLeftRight size={15} />
                            </button>

                            {/* View Details Icon Button */}
                            <button
                              onClick={() => setViewProductItem(item)}
                              className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 flex items-center justify-center border border-gray-200 transition-all cursor-pointer"
                              title="View Full Product Details"
                            >
                              <Eye size={15} />
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

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400 flex justify-between items-center">
            <span>Showing {filteredProducts.length} of {warehouseStock.length} warehouse items</span>
            <span className="font-bold text-gray-700">Total Storage Valuation: Rs. {totalWarehouseValue.toLocaleString()}</span>
          </div>

        </div>
      )}



      {/* ─── TAB 3: RECEIVE STOCK FROM PURCHASES ─────────────────────────────── */}
      {activeTab === 'receive' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl mx-auto space-y-5 animate-in zoom-in-95 duration-150">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Download size={18} className="text-blue-600" />
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">Receive Purchase Shipment into Warehouse Storage</h2>
          </div>

          {alertError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle size={15} />
              <span>{alertError}</span>
            </div>
          )}

          {alertSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 size={15} />
              <span>{alertSuccess}</span>
            </div>
          )}

          <form onSubmit={handleReceiveStockSubmit} className="space-y-4 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Supplier / Manufacturer *
                </label>
                <select
                  value={receiveForm.supplier}
                  onChange={e => setReceiveForm({ ...receiveForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-800 bg-white focus:border-blue-500 focus:outline-none transition"
                >
                  {COMPANIES.map(c => <option key={c.id} value={c.name}>{c.name}{c.company_type ? ` (${c.company_type})` : ''}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  PO Reference No.
                </label>
                <input
                  type="text"
                  value={receiveForm.poReference}
                  onChange={e => setReceiveForm({ ...receiveForm, poReference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono font-bold text-gray-800 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                Product Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Chlorpyrifos 20% EC"
                value={receiveForm.productName}
                onChange={e => setReceiveForm({ ...receiveForm, productName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Batch No. *
                </label>
                <input
                  type="text"
                  value={receiveForm.batchNo}
                  onChange={e => setReceiveForm({ ...receiveForm, batchNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono font-bold text-blue-700 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Quantity Received *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={receiveForm.qtyReceived}
                  onChange={e => setReceiveForm({ ...receiveForm, qtyReceived: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-black text-gray-900 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Storage Rack / Bay No.
                </label>
                <input
                  type="text"
                  value={receiveForm.rackNo}
                  onChange={e => setReceiveForm({ ...receiveForm, rackNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  value={receiveForm.mfgDate}
                  onChange={e => setReceiveForm({ ...receiveForm, mfgDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={receiveForm.expiryDate}
                  onChange={e => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Download size={15} />
                <span>Receive into Warehouse Stock</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ─── TAB 3: STOCK TRANSFER HISTORY ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-3 animate-in fade-in duration-150 p-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <History size={18} className="text-green-600" />
              <div>
                <h2 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">Stock Transfer History Audit Log</h2>
                <span className="text-[10px] text-gray-400 font-semibold">{transfersHistory.length} Total Audit Records</span>
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter history log..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:border-green-600 focus:outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* 5-Column Clean Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ref ID & Date</th>
                  <th className="py-3 px-4">Movement & Route</th>
                  <th className="py-3 px-4">Product Name & Batch</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfersHistory
                  .filter(trf => !historySearch || 
                    trf.id.toLowerCase().includes(historySearch.toLowerCase()) ||
                    trf.product_name.toLowerCase().includes(historySearch.toLowerCase()) ||
                    trf.batch_no.toLowerCase().includes(historySearch.toLowerCase()) ||
                    trf.destination.toLowerCase().includes(historySearch.toLowerCase())
                  )
                  .map(trf => {
                    const isInward = trf.type === 'Purchase Inward';
                    return (
                      <tr key={trf.id} className="odd:bg-white even:bg-gray-50/50 hover:bg-green-50/40 transition">
                        
                        {/* 1. Ref ID & Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-black text-green-700 text-xs block">{trf.id}</span>
                          <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">{trf.date}</span>
                        </td>

                        {/* 2. Movement & Route */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                              isInward ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              {trf.type}
                            </span>
                          </div>
                          <span className="text-[11px] font-extrabold text-gray-800 block truncate max-w-[200px]">
                            ➜ {trf.destination}
                          </span>
                        </td>

                        {/* 3. Product & Batch */}
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-gray-900 block">{trf.product_name}</span>
                          <span className="text-[10px] font-mono text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            Batch: {trf.batch_no}
                          </span>
                        </td>

                        {/* 4. Quantity */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-800 text-xs whitespace-nowrap">
                          {trf.qty.toLocaleString()} <span className="text-[10px] font-semibold text-gray-500">{trf.unit}</span>
                        </td>

                        {/* 5. View Details Action */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTransfer(trf)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl border border-green-200 transition text-xs cursor-pointer shadow-2xs"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 flex items-center justify-between border-t border-gray-100">
            <span>Audit trail logging enabled for all warehouse inventory dispatches</span>
            <span className="font-bold text-gray-600">Total Entries: {transfersHistory.length}</span>
          </div>

        </div>
      )}

      {/* ─── TRANSFER AUDIT DETAIL MODAL ─────────────────────────────────────── */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-green-600 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-white/20 rounded-xl">
                  <FileText size={16} />
                </div>
                <div>
                  <span className="text-[9px] font-black text-green-100 uppercase tracking-widest block">Transfer Audit Receipt</span>
                  <h3 className="text-sm font-extrabold font-mono">{selectedTransfer.id}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="p-1 text-white/80 hover:text-white rounded-full hover:bg-green-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Product Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Product Description</span>
                <span className="font-black text-gray-900 text-sm block">{selectedTransfer.product_name}</span>
                <div className="flex items-center space-x-2 pt-1">
                  <span className="px-2 py-0.5 bg-white border border-gray-300 font-mono font-bold text-gray-700 rounded text-[10px]">
                    Batch: {selectedTransfer.batch_no}
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 font-black rounded text-[10px]">
                    Qty: {selectedTransfer.qty.toLocaleString()} {selectedTransfer.unit}
                  </span>
                </div>
              </div>

              {/* Transfer Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-white border border-gray-200 rounded-xl p-3.5">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">Movement Type</span>
                  <span className="font-extrabold text-green-700">{selectedTransfer.type}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">Status</span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                    <Check size={10} />
                    <span>{selectedTransfer.status}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">Date & Time</span>
                  <span className="font-semibold text-gray-800">{selectedTransfer.date}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">Authorized By</span>
                  <span className="font-extrabold text-gray-900">{selectedTransfer.handled_by}</span>
                </div>
              </div>

              {/* Source & Destination Route */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Transfer Route</span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">From (Source):</span>
                    <span className="font-bold text-gray-900">{selectedTransfer.source}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">To (Destination):</span>
                    <span className="font-extrabold text-green-700">{selectedTransfer.destination}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedTransfer.notes && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                  <span className="font-bold uppercase tracking-wider text-[9px] text-amber-700 block mb-0.5">Dispatch Notes</span>
                  <p>{selectedTransfer.notes}</p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                Close Audit Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── POPUP MODAL: TRANSFER STOCK TO INVENTORY ───────────────────────── */}
      {transferModalItem && activeModalStockItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-green-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-green-400">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight">Stock Transfer to POS Counter</h2>
                  <p className="text-[11px] text-gray-300 font-medium">Relocate stock from Main Godown to Active POS Inventory</p>
                </div>
              </div>
              <button
                onClick={() => setTransferModalItem(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              
              {/* Product Details Banner */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50/60 border border-green-200/80 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded-md border border-green-200">
                      {activeModalStockItem.category}
                    </span>
                    <h3 className="text-base font-extrabold text-gray-900 mt-1">{activeModalStockItem.product_name}</h3>
                    <p className="text-xs font-semibold text-gray-500">{activeModalStockItem.company} • Code: <span className="font-mono text-gray-700">{activeModalStockItem.code}</span></p>
                  </div>
                  <span className="text-xs font-extrabold bg-white px-3 py-1 rounded-xl text-gray-700 border border-gray-200 shadow-2xs">
                    Unit: {activeModalStockItem.unit}
                  </span>
                </div>

                {/* Batch Selector if multiple batches exist */}
                {allProductBatches.length > 1 && (
                  <div className="pt-2 border-t border-green-200/60 flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-700">Select Batch:</span>
                    <select
                      value={selectedStockId}
                      onChange={e => setSelectedStockId(e.target.value)}
                      className="px-3 py-1 rounded-lg border border-green-300 text-xs font-bold bg-white text-gray-800 focus:outline-none"
                    >
                      {allProductBatches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.batch_no} (Exp: {b.expiry_date || 'N/A'}) — Avail: {b.warehouse_qty} {activeModalStockItem.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Current Stock Comparison Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 text-blue-700">
                      <WarehouseIcon size={16} />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Main Warehouse Stock</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Rack: {activeModalStockItem.rack_no || 'Godown A'}</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-blue-900">{activeModalStockItem.warehouse_qty.toLocaleString()}</span>
                    <span className="text-xs font-bold text-blue-700 ml-1">{activeModalStockItem.unit}</span>
                  </div>
                </div>

                <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 text-purple-700">
                      <Boxes size={16} />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">POS Counter Stock</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Active POS Inventory</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-purple-900">{activeModalStockItem.pos_counter_qty.toLocaleString()}</span>
                    <span className="text-xs font-bold text-purple-700 ml-1">{activeModalStockItem.unit}</span>
                  </div>
                </div>
              </div>

              {/* Transfer Form Inputs */}
              <div className="space-y-4 pt-1">
                
                {/* Transfer Quantity Input & Presets */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                      Quantity to Transfer ({activeModalStockItem.unit}) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400 font-semibold">Max Available: {activeModalStockItem.warehouse_qty}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max={activeModalStockItem.warehouse_qty}
                      placeholder="Enter transfer qty..."
                      value={modalQty}
                      onChange={e => setModalQty(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-bold text-sm text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition bg-white"
                    />

                    {/* Quick Presets */}
                    <div className="flex items-center space-x-1">
                      {[10, 25, 50, 100].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalQty(String(Math.min(val, activeModalStockItem.warehouse_qty)))}
                          className="px-2.5 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 transition cursor-pointer"
                        >
                          +{val}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setModalQty(String(activeModalStockItem.warehouse_qty))}
                        className="px-2.5 py-2 text-xs font-bold bg-green-100 hover:bg-green-200 text-green-800 rounded-lg border border-green-300 transition cursor-pointer"
                      >
                        All
                      </button>
                    </div>
                  </div>
                </div>

                {/* Destination Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                    Target Destination Counter / Store <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalDestination}
                    onChange={e => setModalDestination(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl font-semibold text-xs text-gray-800 bg-white focus:border-green-500 focus:outline-none transition"
                  >
                    <option>Counter A Register (Bathinda H.O.)</option>
                    <option>Counter B Register (Bathinda H.O.)</option>
                    <option>Ludhiana Depot Branch Inventory</option>
                    <option>Karnal Sub-Warehouse</option>
                  </select>
                </div>

                {/* Handled By & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Handled By</label>
                    <input
                      type="text"
                      value={modalHandledBy}
                      onChange={e => setModalHandledBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Dispatch Note / Remarks</label>
                    <input
                      type="text"
                      placeholder="Optional transfer note..."
                      value={modalNotes}
                      onChange={e => setModalNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Validation Error Alert inside Modal */}
                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-150">
                    <AlertTriangle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setTransferModalItem(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmModalTransfer}
                className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Transfer to Inventory</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── POPUP MODAL: VIEW PRODUCT DETAILS ───────────────────────── */}
      {viewProductItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-3.5 bg-gradient-to-r from-gray-900 via-gray-800 to-green-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-green-400">
                  <Eye size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight">Warehouse Product Details</h2>
                  <p className="text-[11px] text-gray-300 font-medium">{viewProductItem.product_name}</p>
                </div>
              </div>
              <button
                onClick={() => setViewProductItem(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 text-xs flex-1 overflow-y-auto scrollbar-none">
              
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                <div>
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Product Code</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">{viewProductItem.code}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                  viewProductItem.warehouse_qty < 100 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {viewProductItem.warehouse_qty < 100 ? 'Low Stock' : 'Stock Available'}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2.5 bg-white border border-gray-200 rounded-2xl p-3.5">
                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Category</span>
                  <span className="font-bold text-gray-800 text-xs">{viewProductItem.category}</span>
                </div>

                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Company / Brand</span>
                  <span className="font-bold text-gray-800 text-xs">{viewProductItem.company}</span>
                </div>

                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Batch Number</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">{viewProductItem.batch_no}</span>
                </div>

                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Expiry Date</span>
                  <span className="font-semibold text-gray-800 text-xs">{viewProductItem.expiry_date || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Storage Location</span>
                  <span className="font-semibold text-gray-800 text-xs">{viewProductItem.rack_no}</span>
                </div>

                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Measuring Unit</span>
                  <span className="font-semibold text-gray-800 text-xs">{viewProductItem.unit}</span>
                </div>
              </div>

              {/* Stock Overview Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">Godown Warehouse Stock</span>
                  <span className="text-lg font-black text-emerald-900 mt-0.5 block">{viewProductItem.warehouse_qty.toLocaleString()} {viewProductItem.unit}</span>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block">POS Counter Stock</span>
                  <span className="text-lg font-black text-purple-900 mt-0.5 block">{viewProductItem.pos_counter_qty.toLocaleString()} {viewProductItem.unit}</span>
                </div>
              </div>

              {/* Vendor & Supplier Information Card */}
              {(() => {
                const vInfo = getVendorDetailsForProduct(viewProductItem);
                return (
                  <div className="bg-gradient-to-br from-green-50/80 to-blue-50/80 border border-green-200 rounded-2xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-green-200 pb-1.5">
                      <div className="flex items-center space-x-1.5 text-green-800 font-extrabold text-[11px] uppercase tracking-wide">
                        <Building2 size={14} />
                        <span>Vendor & Supplier Information</span>
                      </div>
                      <span className="px-2 py-0.5 bg-green-200/80 text-green-900 rounded-full font-bold text-[9px]">
                        Authorized Supplier
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[9px] font-extrabold text-gray-500 uppercase block">Vendor / Company</span>
                        <span className="font-extrabold text-gray-900 text-xs block">{vInfo.name}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-extrabold text-gray-500 uppercase block">Contact Person</span>
                        <span className="font-bold text-gray-800 text-xs block">{vInfo.contact}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-extrabold text-gray-500 uppercase block">Supplier Phone</span>
                        <span className="font-mono font-bold text-green-700 text-xs block">{vInfo.phone}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-extrabold text-gray-500 uppercase block">Depot Location</span>
                        <span className="font-bold text-gray-800 text-xs block">{vInfo.city}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Pricing Information */}
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block">Wholesale Purchase Rate</span>
                  <span className="font-bold text-gray-800 text-xs">Rs. {viewProductItem.purchase_rate}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block">Selling Retail Rate</span>
                  <span className="font-extrabold text-green-700 text-xs">Rs. {viewProductItem.selling_rate}</span>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setViewProductItem(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const itemToTransfer = viewProductItem;
                  setViewProductItem(null);
                  handleOpenTransferModal(itemToTransfer);
                }}
                className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeftRight size={14} />
                <span>Transfer Stock to Inventory</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
