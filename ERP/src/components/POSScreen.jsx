import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Barcode, Trash2, Printer, FolderLock, Plus, Minus, X, 
  CheckCircle2, Eye, Clock, User, Coins, CreditCard, Building2, 
  Wallet, AlertTriangle, CheckCircle, XCircle, Package, FileText,
  Calendar, Layers, ArrowRight, RefreshCw, ShoppingBag, ChevronLeft,
  ChevronRight, Scale, ShoppingCart, ArrowLeft
} from 'lucide-react';
import { PRODUCTS, CUSTOMERS, COMPANIES, UNITS, CATEGORIES, setStoredData } from '../utils/mockData';
import { productApi, salesApi, customerApi } from '../api';
import POSModals from './POSModals';
import PaymentProcessor from './PaymentProcessor';
import { usePOSContext } from '../context/POSContext';
import { useLanguage } from '../context/LanguageContext';

export default function POSScreen({ 
  currentUser, addAuditLog, triggerNotificationToast,
  heldSales, setHeldSales, invoices, setInvoices
}) {
  const { t, language } = useLanguage();

  const translateCat = (catName) => {
    if (language !== 'ur' || !catName) return catName || '—';
    if (catName.includes('Pesticides')) return 'پیسٹی سائیڈز (ادویات)';
    if (catName.includes('Fungicides')) return 'پھپھوندی کش (فنجی سائیڈز)';
    if (catName.includes('Fertilizers')) return 'کھاد (فرٹیلائزرز)';
    if (catName.includes('Seeds')) return 'بیج (سیڈز)';
    if (catName.includes('Agro')) return 'زرعی کیمیکلز';
    return catName;
  };

  const translateUnit = (uName) => {
    if (language !== 'ur' || !uName) return uName || 'Unit';
    if (uName.includes('Bottle')) return 'بوتل (500ml)';
    if (uName.includes('Packet')) return 'پیکٹ (1Kg)';
    if (uName.includes('Bag')) return 'بوری (50Kg)';
    if (uName === 'Kg') return 'کلوگرام';
    if (uName === 'Litre') return 'لیٹر';
    if (uName === 'Gram') return 'گرام';
    return uName;
  };

  const translatePaymentMethod = (pm) => {
    if (language !== 'ur' || !pm) return pm || 'Cash';
    if (pm === 'Cash') return 'کیش (نقد)';
    if (pm.includes('Mixed')) return 'مکسڈ (کیش + ادھار)';
    if (pm === 'Credit') return 'ادھار';
    if (pm.includes('Bank')) return 'بینک ٹرانسفر';
    if (pm.includes('Easy')) return 'ایزی پیسہ';
    if (pm.includes('Jazz')) return 'جاز کیش';
    return pm;
  };
  const {
    cart, setCart,
    dbActiveOffers, filterActiveOffers, findMatchingOffer,
    selectedCustomer, setSelectedCustomer, handleCustomerChange,
    paymentMethod, setPaymentMethod,
    receivedAmount, setReceivedAmount,
    paymentDetails, setPaymentDetails,
    addProductToCart,
    handleQuantityChange, handleUnitChange, handlePriceChange, handleDiscountChange, removeCartItem,
    resetPOSWorkspace,
    subtotal, gstAmount, totalDiscount, billDiscountAmount, grandTotal, receivedVal, changeReturn,
    offerSavings,
    walkInName, setWalkInName, walkInPhone, setWalkInPhone,
    billDiscountType, setBillDiscountType, billDiscountValue, setBillDiscountValue
  } = usePOSContext();

  const [invoiceId, setInvoiceId] = useState(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [salesperson] = useState(currentUser.name || 'Admin');
  
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState(PRODUCTS[0] || null);
  
  const [activeModal, setActiveModal] = useState(null);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null);
  const [isBillingDrawerOpen, setIsBillingDrawerOpen] = useState(false);
  const [isPaymentPage, setIsPaymentPage] = useState(false);

  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState('');
  const ITEMS_PER_PAGE = 7;
  const [posProductsList, setPosProductsList] = useState(() => {
    try {
      const cached = localStorage.getItem('agro_pos_products_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return PRODUCTS;
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const barcodeRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Parallel background hydration for products & customers
  useEffect(() => {
    let isMounted = true;
    const syncPOSData = async () => {
      try {
        const [data, custs] = await Promise.all([
          productApi.getAll().catch(() => null),
          customerApi.getAll().catch(() => null)
        ]);

        if (!isMounted) return;

        if (data && Array.isArray(data) && data.length > 0) {
          const merged = [...data];
          PRODUCTS.forEach(p => {
            if (!merged.some(mp => (mp._id || mp.id) === (p._id || p.id) || mp.code === p.code)) {
              merged.push(p);
            }
          });
          data.forEach(p => {
            const idx = PRODUCTS.findIndex(mp => (mp._id || mp.id) === (p._id || p.id) || mp.code === p.code);
            if (idx !== -1) {
              PRODUCTS[idx] = { ...PRODUCTS[idx], ...p };
            } else {
              PRODUCTS.unshift(p);
            }
          });
          setPosProductsList(merged);
          try {
            localStorage.setItem('agro_pos_products_cache', JSON.stringify(merged));
          } catch (e) {}
        }

        if (custs && Array.isArray(custs) && custs.length > 0) {
          custs.forEach(c => {
            if (!CUSTOMERS.some(ic => (ic._id || ic.id) === (c._id || c.id) || ic.code === c.code)) {
              CUSTOMERS.push(c);
            }
          });
        }
      } catch (e) {}
    };

    syncPOSData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (barcodeRef.current) barcodeRef.current.focus();
  }, []);

  // ── Catalog filter ─────────────────────────────────────────────────────────
  const catalogProducts = useMemo(() => {
    if (!catalogSearch.trim()) return posProductsList;
    const q = catalogSearch.toLowerCase();
    return posProductsList.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.barcode || '').includes(q)
    );
  }, [catalogSearch, posProductsList]);

  const totalPages = Math.ceil(catalogProducts.length / ITEMS_PER_PAGE) || 1;
  const currentCatalogProducts = useMemo(() => {
    const start = (catalogPage - 1) * ITEMS_PER_PAGE;
    return catalogProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [catalogProducts, catalogPage]);

  // ── Search suggestions ─────────────────────────────────────────────────────
  const searchResults = searchProductQuery.trim() === ''
    ? []
    : posProductsList.filter(p => {
        const q = searchProductQuery.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.barcode || '').includes(q);
      });

  // ── Barcode ────────────────────────────────────────────────────────────────
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const prod = posProductsList.find(p =>
      (p.barcode || '').toLowerCase() === barcodeInput.trim().toLowerCase() ||
      (p.code || '').toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (prod) addProductToCart(prod);
    setBarcodeInput('');
  };

  const handleSelectFromCatalog = (product) => addProductToCart(product);

  // ── Search submit ──────────────────────────────────────────────────────────
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchProductQuery.trim()) return;
    const q = searchProductQuery.trim().toLowerCase();
    const matched = posProductsList.find(p =>
      (p.name || '').toLowerCase() === q || (p.code || '').toLowerCase() === q || p.barcode === q || (p.name || '').toLowerCase().includes(q)
    ) || searchResults[0];
    if (matched) { addProductToCart(matched); setSearchProductQuery(''); }
  };

  // ── Save Walk-in as Customer ───────────────────────────────────────────────
  const handleSaveWalkInCustomer = async () => {
    const trimmedName = walkInName.trim();
    if (!trimmedName) {
      triggerNotificationToast('Missing Name', 'Please enter a name to save as a customer.', 'error');
      return;
    }

    try {
      const created = await customerApi.create({
        name: trimmedName,
        phone: walkInPhone.trim() || '03000000000',
        customer_type: 'Retail',
        address: 'Counter Customer',
        status: 'Active'
      });

      const newCust = created || {
        _id: `CUST_${Date.now()}`,
        id: `CUST_${Date.now()}`,
        code: `CUST-REG${CUSTOMERS.length + 1}`,
        name: trimmedName,
        phone: walkInPhone.trim() || 'N/A',
        address: 'Counter Customer',
        customer_type: 'Retail',
        outstanding_balance: 0,
      };

      if (!CUSTOMERS.some(c => (c._id || c.id) === (newCust._id || newCust.id) || c.name === newCust.name)) {
        CUSTOMERS.unshift(newCust);
      }

      handleCustomerChange(newCust);
      triggerNotificationToast('Customer Saved', `${newCust.name} saved to database.`, 'success');
    } catch (e) {
      triggerNotificationToast('Customer Save Error', 'Could not save customer to database', 'error');
    }
  };

  // ── Complete sale ──────────────────────────────────────────────────────────
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (receivedVal < 0) {
      triggerNotificationToast('Invalid Payment', 'Payment amount cannot be negative.', 'error');
      return;
    }
    if (paymentMethod !== 'Credit' && receivedVal < grandTotal) {
      triggerNotificationToast('Insufficient Payment', `Received amount (Rs. ${receivedVal}) is less than Gross Total (Rs. ${grandTotal})`, 'error');
      return;
    }
    
    // Validate Payment Details
    if (paymentMethod === 'Card') {
      if (!paymentDetails.card_type || !paymentDetails.card_number || !paymentDetails.card_name) {
        triggerNotificationToast('Incomplete Payment Details', 'Please fill in all required Card details.', 'error');
        return;
      }
    } else if (paymentMethod === 'Bank Transfer') {
      if (!paymentDetails.bank_name || !paymentDetails.account_no || !paymentDetails.transaction_id) {
        triggerNotificationToast('Incomplete Payment Details', 'Please fill in all required Bank Transfer details.', 'error');
        return;
      }
    } else if (paymentMethod === 'Mobile Wallet') {
      if (!paymentDetails.wallet_name || !paymentDetails.mobile_no || !paymentDetails.transaction_id) {
        triggerNotificationToast('Incomplete Payment Details', 'Please fill in all required Mobile Wallet details.', 'error');
        return;
      }
    }

    let activeCustomer = selectedCustomer;
    const isWalkIn = !activeCustomer || activeCustomer.id === 'CUST001' || activeCustomer._id === 'CUST001' || activeCustomer.name === 'Walk-in Customer';

    if (isWalkIn && walkInName.trim()) {
      try {
        const createdCust = await customerApi.create({
          name: walkInName.trim(),
          phone: walkInPhone.trim() || '03000000000',
          customer_type: 'Retail',
          address: 'Counter Customer',
          status: 'Active'
        }).catch(() => null);

        if (createdCust) {
          activeCustomer = createdCust;
          if (!CUSTOMERS.some(c => (c._id || c.id) === (createdCust._id || createdCust.id))) {
            CUSTOMERS.unshift(createdCust);
          }
          handleCustomerChange(createdCust);
        }
      } catch (e) {}
    }

    const invoiceCustomerName = (isWalkIn && walkInName.trim()) ? walkInName.trim() : (activeCustomer?.name || 'Walk-in Customer');
    const invoiceCustomerPhone = (isWalkIn && walkInPhone.trim()) ? walkInPhone.trim() : (activeCustomer?.phone || '0000000000');

    const newInvoice = {
      id: invoiceId, invoice_no: invoiceId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer_id: activeCustomer?._id || activeCustomer?.id || '',
      customer_name: invoiceCustomerName,
      customer_phone: invoiceCustomerPhone,
      customer_type: activeCustomer?.customer_type || 'Retail',
      user_id: currentUser?.id || 'U1', cashier_name: salesperson,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount_amount: parseFloat(totalDiscount.toFixed(2)),
      bill_discount: parseFloat(billDiscountAmount.toFixed(2)),
      bill_discount_type: billDiscountType,
      bill_discount_value: parseFloat(billDiscountValue) || 0,
      tax_amount: parseFloat(gstAmount.toFixed(2)),
      freight: 0, other_charges: 0, grand_total: grandTotal,
      paid_amount: paymentMethod === 'Credit' ? receivedVal : grandTotal,
      remaining_amount: paymentMethod === 'Credit' ? grandTotal - receivedVal : 0,
      round_off: 0,
      payment_status: paymentMethod === 'Credit' ? (receivedVal > 0 ? 'Partial' : 'Credit') : 'Paid',
      payment_method: paymentMethod, 
      payment_details: paymentDetails,
      is_held: false,
      items: cart.map(item => ({
        product_id: item.product._id || item.product.id,
        product_name: item.product.name,
        batch_no: item.batch_no || 'N/A', quantity: item.quantity,
        unit: item.unitLabel, price: item.price, line_total: item.total,
        discount: item.discount || 0,
        offer_applied: item.offerApplied || null,
        offer_type: item.offerType || null,
        free_qty: item.freeQty || 0,
        original_price: item.originalPrice || item.price
      }))
    };

    try {
      const savedInvoice = await salesApi.createPosSale(newInvoice);
      setInvoices([savedInvoice || newInvoice, ...invoices]);
      addAuditLog('Invoice Completed', `Invoice ${invoiceId} — ${selectedCustomer.name} — Rs. ${grandTotal}`);

      // Trigger stock alert toast notifications for purchased items
      cart.forEach(item => {
        const prod = item.product;
        if (prod) {
          const currentStock = (Array.isArray(prod.batches) ? prod.batches : []).reduce((s, b) => s + (b.stock_qty || 0), 0);
          const remainingStock = Math.max(0, currentStock - item.quantity);
          if (remainingStock <= 0) {
            if (triggerNotificationToast) triggerNotificationToast('Out of Stock Alert 🔴', `${prod.name} is now OUT OF STOCK!`, 'error');
          } else if (remainingStock <= (prod.min_stock || 15)) {
            if (triggerNotificationToast) triggerNotificationToast('Low Stock Alert ⚠️', `${prod.name} is running low (${remainingStock} items left)!`, 'warning');
          }
        }
      });

      setSelectedInvoiceForModal(savedInvoice || newInvoice);
      setActiveModal('print_preview');
      
      await fetchPOSProducts();

      resetPOSWorkspace();
      setInvoiceId(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setIsBillingDrawerOpen(false);
      setIsPaymentPage(false);
      if (barcodeRef.current) barcodeRef.current.focus();
    } catch (err) {
      triggerNotificationToast('Sale Error', err.message || 'Failed to complete POS sale.', 'error');
    }
  };

  const handleHoldSale = () => {
    if (cart.length === 0) return;
    setHeldSales([{
      id: `HOLD_${Date.now()}`, hold_no: `HOLD-00${heldSales.length + 1}`,
      customer_id: selectedCustomer.id, customer_name: selectedCustomer.name,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: `Items: ${cart.length}`,
      items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, price: i.price, batch_id: i.batch.id, discount: i.discount, tax_rate: i.taxRate }))
    }, ...heldSales]);
    
    resetPOSWorkspace();
    setInvoiceId(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setIsBillingDrawerOpen(false);
    setIsPaymentPage(false);
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex w-full bg-gray-50 text-gray-800 font-sans select-none items-start relative gap-4 sm:gap-6">
      
      {/* ── MAIN CONTENT (Left Side) ── */}
      <div className="flex-1 flex flex-col space-y-6 transition-all duration-300 min-w-0">
        
        {/* ── 1. HEADER CARD ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 border border-green-200 p-2.5 rounded-xl text-green-700">
              <FileText size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Sales Invoice</span>
              <h2 className="text-base font-extrabold text-gray-900 font-mono tracking-tight">{invoiceId}</h2>
            </div>
          </div>

        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-2.5 px-4 rounded-xl w-full sm:w-auto transition-all">
          <div className="flex flex-col">
            <div className="relative flex items-center">
              <select
                value={selectedCustomer._id || selectedCustomer.id}
                onChange={e => { const c = CUSTOMERS.find(c => (c._id || c.id) === e.target.value); if (c) handleCustomerChange(c); }}
                className="appearance-none bg-transparent text-sm font-extrabold text-gray-800 focus:outline-none cursor-pointer pr-6 pb-1"
              >
                {CUSTOMERS.map((c, i) => <option key={c._id || c.id || `cust_${i}`} value={c._id || c.id}>{c.name}</option>)}
              </select>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-800 font-bold mb-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 mt-1">
              <span>📞 {selectedCustomer.phone}</span>
              <span className="text-gray-300">|</span>
              <span className="text-blue-600">{selectedCustomer.customer_type}</span>
              {(selectedCustomer.id !== 'CUST001' && selectedCustomer.name !== 'Walk-in Customer') && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className={selectedCustomer.outstanding_balance > 0 ? "text-red-500" : "text-green-600"}>
                    Bal: Rs. {selectedCustomer.outstanding_balance}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 🛒 Cart Icon Button with Badge */}
          <button
            type="button"
            onClick={() => setIsBillingDrawerOpen(!isBillingDrawerOpen)}
            className="relative flex items-center gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white px-4 py-2 rounded-lg text-xs font-extrabold transition shadow-sm cursor-pointer border border-green-700"
            title="Toggle Cart Drawer"
          >
            <ShoppingCart size={16} />
            <span>Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md border-2 border-white">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. CONTENT SECTION: CATALOG OR PAYMENT PAGE ── */}
      {!isPaymentPage ? (
        /* ══════════════════════════════════════════════════
           CATALOG VIEW (Default POS Screen)
        ══════════════════════════════════════════════════ */
        <>
          {/* SEARCH BAR */}
          <div className="sticky top-2 z-20 bg-white rounded-xl border border-gray-200 p-3 shadow-sm max-w-full overflow-visible">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Product Name, Barcode, SKU… (Enter to Add)"
                  value={searchProductQuery}
                  onChange={e => setSearchProductQuery(e.target.value)}
                  className="pl-9 pr-8 w-full rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 placeholder-gray-400 bg-white"
                />
                {searchProductQuery && (
                  <button type="button" onClick={() => setSearchProductQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    <XCircle size={15} />
                  </button>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 overflow-hidden max-h-72 overflow-y-auto divide-y divide-gray-100">
                    {searchResults.map((prod, i) => {
                      const activeOffers = dbActiveOffers && filterActiveOffers ? filterActiveOffers(dbActiveOffers) : [];
                      const matchedOffer = findMatchingOffer ? findMatchingOffer(prod, activeOffers) : null;
                      return (
                        <div
                          key={prod._id || prod.id || `sr_${i}`}
                          onMouseDown={e => { e.preventDefault(); addProductToCart(prod); }}
                          className="p-3 hover:bg-green-50/70 cursor-pointer transition flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-gray-900 group-hover:text-green-700 truncate">{prod.name}</h4>
                              {matchedOffer && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  🏷️ {matchedOffer.name}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono block">SKU: {prod.code}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-extrabold text-green-700 font-mono block">Rs. {prod.retail_price}</span>
                            <span className="text-[10px] text-gray-400">Stock: {(Array.isArray(prod.batches) ? prod.batches : []).reduce((s, b) => s + (b?.stock_qty || 0), 0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </form>

              <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 shrink-0 sm:w-auto">
                <div className="relative flex-1 sm:w-52">
                  <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none" />
                  <input
                    ref={barcodeRef}
                    type="text"
                    placeholder="Scan Barcode…"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    className="pl-9 w-full rounded-lg border border-gray-300 py-2 text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none placeholder-gray-400 bg-gray-50/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setSearchProductQuery(''); setBarcodeInput(''); }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0"
                >Clear</button>
              </form>
            </div>
          </div>

          {/* PRODUCT CATALOG TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-green-600" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Product Catalog</h3>
                <span className="text-[10px] bg-green-100 text-green-800 font-extrabold px-2 py-0.5 rounded-full">
                  {catalogProducts.length} products
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Filter catalog…"
                  value={catalogSearch}
                  onChange={e => { setCatalogSearch(e.target.value); setCatalogPage(1); }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:border-green-600"
                />
                <button
                  type="button"
                  onClick={() => setIsBillingDrawerOpen(true)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ShoppingCart size={14} />
                  <span>Cart ({cart.length})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left rtl:text-right text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">{t('product_name', 'Product Name')}</th>
                    <th className="py-2.5 px-3 w-24">{t('sku', 'SKU')}</th>
                    <th className="py-2.5 px-3 w-32">{t('category', 'Category')}</th>
                    <th className="py-2.5 px-3 text-center w-20">{t('stock', 'Stock')}</th>
                    <th className="py-2.5 px-3 text-center w-24">{t('unit', 'Unit')}</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left w-32">{t('price', 'Price')} ({selectedCustomer?.customer_type || 'Retail'})</th>
                    <th className="py-2.5 px-3 text-center w-24">{t('add', 'Add')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentCatalogProducts.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400 font-medium">No products found.</td></tr>
                  ) : currentCatalogProducts.map((prod, idx) => {
                    const stock = prod.batches?.reduce((sum, b) => sum + b.stock_qty, 0) ?? 0;
                    let unitPrice = prod.retail_price;
                    if (selectedCustomer?.customer_type === 'Wholesaler') unitPrice = prod.wholesale_price || prod.retail_price;
                    else if (selectedCustomer?.customer_type === 'Dealer') unitPrice = prod.dealer_price || prod.retail_price;
                    else if (selectedCustomer?.customer_type === 'Farmer') unitPrice = prod.farmer_price || prod.retail_price;
                    const rawCatName  = CATEGORIES.find(c => c.id === prod.category_id)?.name || '—';
                    const rawUnitName = UNITS.find(u => u.id === prod.unit_id)?.name || 'Unit';
                    const catName  = translateCat(rawCatName);
                    const unitName = translateUnit(rawUnitName);
                    const inCart   = cart.some(i => (i.product._id || i.product.id)?.toString() === (prod._id || prod.id)?.toString());
                    const activeOffers = dbActiveOffers && filterActiveOffers ? filterActiveOffers(dbActiveOffers) : [];
                    const matchedOffer = findMatchingOffer ? findMatchingOffer(prod, activeOffers) : null;

                    return (
                      <tr
                        key={prod._id || prod.id || `catalog_${idx}`}
                        onClick={() => handleSelectFromCatalog(prod)}
                        className={`cursor-pointer transition group ${inCart ? 'bg-green-50/50' : 'hover:bg-green-50/40'}`}
                      >
                        <td className="py-2.5 px-3 font-bold text-gray-400 w-12 whitespace-nowrap">{(catalogPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 group-hover:text-green-700 min-w-[200px]">
                          <div className="truncate flex items-center gap-1.5 flex-wrap">
                            <span>{prod.name}</span>
                            {matchedOffer && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                🏷️ {matchedOffer.type === 'BuyXGetY'
                                  ? `Buy ${matchedOffer.buyQty} Get ${matchedOffer.getQty} Free`
                                  : matchedOffer.type === 'Percentage'
                                  ? `${matchedOffer.discountValue}% OFF`
                                  : `Rs. ${matchedOffer.discountValue} OFF`}
                              </span>
                            )}
                            {inCart && <span className="text-[9px] bg-green-100 text-green-700 font-extrabold px-1.5 py-0.5 rounded border border-green-200">{t('in_cart', 'In Cart')}</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-500 text-[11px] w-24 whitespace-nowrap">{prod.code}</td>
                        <td className="py-2.5 px-3 text-gray-600 font-medium w-32 whitespace-nowrap">{catName}</td>
                        <td className="py-2.5 px-3 text-center w-20">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            stock > 15 ? 'bg-green-100 text-green-700 border-green-200' :
                            stock > 0  ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                         'bg-red-100 text-red-700 border-red-200'
                          }`}>{stock > 0 ? stock : t('out_of_stock', 'Out')}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-500 font-medium w-24 whitespace-nowrap">{unitName}</td>
                        <td className="py-2.5 px-3 text-right rtl:text-left font-mono font-black text-green-700 w-32 whitespace-nowrap">
                          {matchedOffer && (matchedOffer.type === 'Percentage' || matchedOffer.type === 'Fixed') ? (
                            <div>
                              <span className="line-through text-gray-400 text-[10px] block font-normal">Rs. {unitPrice}</span>
                              <span className="text-green-700 font-extrabold">
                                Rs. {(matchedOffer.type === 'Percentage'
                                  ? (unitPrice - (unitPrice * matchedOffer.discountValue) / 100)
                                  : Math.max(0, unitPrice - matchedOffer.discountValue)).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span>Rs. {unitPrice}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center w-24">
                          <button
                            type="button"
                            disabled={stock === 0}
                            onClick={e => { e.stopPropagation(); handleSelectFromCatalog(prod); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1 mx-auto ${
                              stock === 0
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                            }`}
                          >
                            <Plus size={12} /> {t('add', 'Add')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-500 font-medium text-[11px]">
                {t('page', 'Page')} {catalogPage} {t('of', 'of')} {totalPages} ({catalogProducts.length} {t('products_count', 'products')})
              </span>
              <div className="flex items-center gap-1.5">
                <button disabled={catalogPage === 1} onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
                  className={`px-3 py-1 rounded-lg font-bold border transition text-xs ${catalogPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'}`}
                >{t('prev', 'Prev')}</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setCatalogPage(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${catalogPage === n ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >{n}</button>
                ))}
                <button disabled={catalogPage === totalPages} onClick={() => setCatalogPage(p => Math.min(totalPages, p + 1))}
                  className={`px-3 py-1 rounded-lg font-bold border transition text-xs ${catalogPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'}`}
                >{t('next', 'Next')}</button>
              </div>
            </div>
          </div>

          {/* RECENT SALES TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-green-600" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">{t('recent_sales_invoices', 'Recent Sales Invoices')}</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">Total: {invoices.length} invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <th className="py-2.5 px-4">{t('invoice_id', 'Invoice ID')}</th>
                    <th className="py-2.5 px-4">{t('customer', 'Customer')}</th>
                    <th className="py-2.5 px-4">{t('date_time', 'Date & Time')}</th>
                    <th className="py-2.5 px-4 text-right rtl:text-left">{t('total', 'Total')}</th>
                    <th className="py-2.5 px-4 text-center">{t('payment', 'Payment')}</th>
                    <th className="py-2.5 px-4 text-center">{t('status', 'Status')}</th>
                    <th className="py-2.5 px-4 text-center">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.length === 0 ? (
                    <tr><td colSpan="7" className="py-8 text-center text-gray-400 font-medium">No recent invoices.</td></tr>
                  ) : invoices.map((inv, idx) => (
                    <tr key={inv._id || inv.id || inv.invoice_no || `inv_${idx}`} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-green-700">{inv.invoice_no || inv.id}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">{inv.customer_name}</td>
                      <td className="py-3 px-4 text-gray-500 font-medium">{inv.date} {inv.time}</td>
                      <td className="py-3 px-4 text-right rtl:text-left font-bold font-mono text-gray-900">Rs. {inv.grand_total?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center text-gray-600 font-medium">{translatePaymentMethod(inv.payment_method)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.payment_status === 'Paid'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>{inv.payment_status === 'Paid' ? t('paid', 'Paid') : t('credit_payment', 'Credit')}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setSelectedInvoiceForModal(inv); setActiveModal('print_preview'); }}
                            className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition cursor-pointer" title="View / Print">
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════
           PAYMENT PAGE VIEW (In Main Content Section)
        ══════════════════════════════════════════════════ */
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Bar for Payment Page */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentPage(false)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back to Products</span>
              </button>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Checkout & Payment</h3>
                <p className="text-xs text-gray-500">Invoice: <strong className="font-mono text-green-700">{invoiceId}</strong> • Customer: <strong className="text-gray-800">{selectedCustomer.name}</strong> ({selectedCustomer.customer_type})</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-extrabold rounded-lg border border-green-200">
                {cart.length} Product{cart.length !== 1 ? 's' : ''} Selected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Purchased Products Summary */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-green-600" />
                  Purchased Products List
                </h4>
                <span className="text-xs text-gray-400 font-medium">{cart.length} items</span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3 text-center">Qty & Unit</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cart.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400 font-medium">Cart is empty.</td></tr>
                    ) : cart.map((item, idx) => (
                      <tr key={item.id || item.product?._id || item.product?.id || `cart_${idx}`} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-3 font-bold text-gray-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900">{item.product.name}</div>
                          {item.offerApplied && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                                🏷️ {item.offerApplied}
                              </span>
                              {item.offerType === 'BuyXGetY' && item.freeQty > 0 && (
                                <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                                  +{item.freeQty} FREE
                                </span>
                              )}
                              {(item.offerType === 'Percentage' || item.offerType === 'Fixed') && item.discount > 0 && (
                                <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                                  - Rs.{item.discount}/unit
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-500 text-[11px]">{item.batch_no}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                          {item.quantity} {item.unitLabel}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-700">
                          {item.offerType === 'Percentage' || item.offerType === 'Fixed' ? (
                            <>
                              <span className="line-through text-gray-400 text-[10px] block">Rs. {item.originalPrice}</span>
                              <span>Rs. {(item.price - item.discount).toFixed(2)}</span>
                            </>
                          ) : (
                            <span>Rs. {item.price}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-green-700">Rs. {item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Payment Method & Gross Total Section */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-5">
              
              {/* Order Summary Breakdown */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Order Summary</h4>
                <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                {offerSavings > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-amber-600">
                    <span>🏷️ Offer Savings</span>
                    <span>- Rs. {offerSavings.toLocaleString()}</span>
                  </div>
                )}
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-green-600">
                    <span>Discount</span>
                    <span>- Rs. {totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                {billDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-green-600">
                    <span>Bill Discount</span>
                    <span>- Rs. {billDiscountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                  <span>GST Amount</span>
                  <span>+ Rs. {gstAmount.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 pt-2.5 mt-2.5 flex justify-between items-center text-sm font-black text-gray-900">
                  <span>Grand Total</span>
                  <span className="text-green-700">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method & Gross Total Integration */}
              <PaymentProcessor 
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                grandTotal={grandTotal}
                receivedAmount={receivedAmount}
                setReceivedAmount={setReceivedAmount}
                paymentDetails={paymentDetails}
                setPaymentDetails={setPaymentDetails}
                layout="compact"
              />

              {/* Complete Sale Button */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0 || (paymentMethod !== 'Credit' && (!receivedAmount || receivedVal < grandTotal))}
                  className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 ${
                    cart.length === 0 || (paymentMethod !== 'Credit' && (!receivedAmount || receivedVal < grandTotal))
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  <span>Complete Sale (Rs. {grandTotal.toLocaleString()})</span>
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════
          CART DRAWER — Shows ONLY Products & Quantity Controls
          NO payment info in drawer!
      ══════════════════════════════════════════════════ */}
      </div>

      {isBillingDrawerOpen && (
        <div
          className="w-[420px] flex-shrink-0 bg-white shadow-sm z-30 flex flex-col rounded-xl border border-gray-200 animate-in slide-in-from-right duration-250 min-h-[calc(100vh-120px)] h-fit mb-6"
        >
          {/* Header */}
          <div className="bg-green-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <div>
                <h3 className="font-extrabold text-sm">Cart Items</h3>
                <p className="text-[10px] text-green-100">{invoiceId} • {cart.length} item{cart.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={() => setIsBillingDrawerOpen(false)} className="hover:bg-green-700 p-1.5 rounded-full transition cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {/* Customer Details Card */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-gray-500" />
                <span className="font-extrabold text-gray-800">
                  {selectedCustomer.id === 'CUST001' && walkInName.trim() ? walkInName.trim() : selectedCustomer.name}
                </span>
              </div>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] font-black rounded border border-green-200 uppercase">
                {selectedCustomer.customer_type}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-gray-600 font-medium pl-5">
              <span>📞 {selectedCustomer.id === 'CUST001' && walkInPhone.trim() ? walkInPhone.trim() : (selectedCustomer.phone || 'N/A')}</span>
            </div>

            {/* Temporary Walk-in Details */}
            {(selectedCustomer.id === 'CUST001' || selectedCustomer.name === 'Walk-in Customer') && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                <input 
                  type="text" 
                  placeholder="Customer name" 
                  value={walkInName}
                  onChange={e => setWalkInName(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Phone..." 
                  value={walkInPhone}
                  onChange={e => setWalkInPhone(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
                />
                <button 
                  onClick={handleSaveWalkInCustomer}
                  className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold px-3 py-1.5 rounded shadow-sm transition active:scale-95 whitespace-nowrap ml-auto"
                >
                  Save
                </button>
              </div>
            )}

          </div>

          {/* Cart Items List ONLY */}
          <div className="flex-1 px-4 py-3 space-y-2.5 text-xs">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">Products in Cart</span>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-gray-300 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <ShoppingCart size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium text-gray-400">Cart is empty — click + Add on products</p>
              </div>
            ) : cart.map((item, idx) => (
              <div key={item.id || item.product?._id || item.product?.id || `drawer_cart_${idx}`} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                {/* Product header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="font-bold text-gray-800 text-xs leading-tight truncate">{item.product.name}</h5>
                    <span className="text-[10px] text-gray-400 font-mono">Batch: {item.batch_no}</span>
                    {/* Offer badge */}
                    {item.offerApplied && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                          🏷️ {item.offerApplied}
                        </span>
                        {item.offerType === 'BuyXGetY' && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                            {item.freeQty > 0 ? `${item.freeQty} FREE` : 'Add more for free item'}
                          </span>
                        )}
                        {(item.offerType === 'Percentage' || item.offerType === 'Fixed') && item.discount > 0 && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                            -Rs.{item.discount}/unit
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeCartItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Qty + Unit Controls */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                    className="w-6 h-6 rounded-md border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer transition">
                    <Minus size={11} />
                  </button>
                  <input
                    type="number" min="0.001" step="0.001" value={item.quantity}
                    onChange={e => handleQuantityChange(idx, e.target.value)}
                    className="w-14 text-center rounded-md border border-gray-300 bg-white py-0.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-green-600"
                  />
                  <button onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                    className="w-6 h-6 rounded-md border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer transition">
                    <Plus size={11} />
                  </button>
                  <select
                    value={item.selectedUnit}
                    onChange={e => handleUnitChange(idx, e.target.value)}
                    className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white py-1 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-green-600 cursor-pointer"
                  >
                    {item.unitOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>

                {/* Actual qty note when factor != 1 */}
                {item.unitFactor !== 1 && (
                  <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                    <Scale size={9} /> Actual: {(item.quantity * item.unitFactor).toFixed(3).replace(/\.?0+$/, '')} {item.baseUnit}
                  </p>
                )}

                {/* Price & Discount Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit Price (Rs.)</label>
                    <input type="number" min="0" value={item.price} onChange={e => handlePriceChange(idx, e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-gray-800 focus:outline-none focus:border-green-600" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Discount / Unit</label>
                    <input type="number" min="0" value={item.discount} onChange={e => handleDiscountChange(idx, e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-gray-800 focus:outline-none focus:border-green-600" />
                  </div>
                </div>

                {/* Line total */}
                <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {item.quantity} {item.unitLabel}
                    {item.offerType === 'BuyXGetY' && item.freeQty > 0 && (
                      <span className="ml-1 text-green-600 font-bold">({item.freeQty} free, pay {item.quantity - item.freeQty})</span>
                    )}
                    {(item.offerType === 'Percentage' || item.offerType === 'Fixed') ? (
                      <> × Rs. <span className="line-through text-gray-300">{item.price}</span> <span className="text-green-700 font-bold">{(item.price - item.discount).toFixed(2)}</span></>
                    ) : (
                      <> × Rs. {item.price}</>
                    )}
                  </span>
                  <span className="font-mono font-extrabold text-green-700 text-sm">Rs. {item.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Footer: Order Summary & Proceed to Payment Button */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4 space-y-4">
            
            <div className="space-y-1.5 px-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {offerSavings > 0 && (
                <div className="flex justify-between text-[11px] font-bold text-amber-600">
                  <span>🏷️ Offer Savings</span><span>- Rs. {offerSavings.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span>GST Amount</span><span>Rs. {gstAmount.toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-[11px] font-bold text-green-600">
                  <span>Discount</span><span>- Rs. {totalDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 border-t border-gray-100 pt-1.5">
                <span className="text-[11px] font-bold text-gray-500 w-24">Bill Discount</span>
                <select 
                  value={billDiscountType} 
                  onChange={(e) => setBillDiscountType(e.target.value)}
                  className="rounded border border-gray-300 text-[10px] p-0.5 focus:border-green-600 outline-none"
                >
                  <option value="Amount">Rs.</option>
                  <option value="Percentage">%</option>
                </select>
                <input 
                  type="number" 
                  min="0"
                  placeholder="0"
                  value={billDiscountValue}
                  onChange={(e) => setBillDiscountValue(e.target.value)}
                  className="flex-1 min-w-0 rounded border border-gray-300 text-[11px] p-0.5 px-1.5 focus:border-green-600 outline-none font-bold"
                />
              </div>
              <div className="flex justify-between text-sm font-black text-gray-800 pt-2 border-t border-gray-200 mt-2">
                <span>Total</span><span className="text-green-700">Rs. {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                let isOutOfStock = false;
                for (const item of cart) {
                  const productTotalReq = cart.filter(c => c.product.id === item.product.id).reduce((s, c) => s + (c.quantity * c.unitFactor), 0);
                  const totalProductStock = item.product.batches?.reduce((s, b) => s + (b.stock_qty || 0), 0) || 0;
                  if (productTotalReq > totalProductStock) {
                    triggerNotificationToast(
                      'Out of Stock',
                      `Cannot proceed. ${item.product.name} requires ${productTotalReq} units but only ${totalProductStock} are available.`,
                      'error'
                    );
                    isOutOfStock = true;
                    break;
                  }
                }
                if (isOutOfStock) return;
                
                setIsBillingDrawerOpen(false);
                setIsPaymentPage(true);
              }}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 ${
                cart.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer active:scale-[0.99]'
              }`}
            >
              <CreditCard size={16} />
              <span>Proceed to Payment</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBillingDrawerOpen(false)}
              className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
            >
              Close Cart Drawer
            </button>
          </div>
        </div>
      )}

      {/* POS Modals */}
      <POSModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        heldSales={heldSales}
        recallHeldInvoice={() => { setActiveModal(null); }}
        invoices={invoices}
        setInvoices={setInvoices}
        addAuditLog={addAuditLog}
        triggerNotificationToast={triggerNotificationToast}
        resetPOSWorkspace={resetPOSWorkspace}
        lastInvoice={selectedInvoiceForModal || invoices[0]}
      />
    </div>
  );
}
