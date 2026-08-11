import React, { createContext, useContext, useState } from 'react';
import { PRODUCTS, CUSTOMERS, COMPANIES, UNITS, getStoredData } from '../utils/mockData';

const POSContext = createContext();

const UNIT_OPTIONS_MAP = {
  'Litre':          [{ key: 'Litre', label: 'Litre (L)', factor: 1 }, { key: 'ML', label: 'Millilitre (ml)', factor: 0.001 }, { key: 'Bottle500', label: 'Bottle 500ml', factor: 0.5 }],
  'Bottle (500ml)': [{ key: 'Bottle500', label: 'Bottle 500ml', factor: 0.5 }, { key: 'Litre', label: 'Litre (L)', factor: 1 }],
  'Kg':             [{ key: 'Kg', label: 'Kilogram (Kg)', factor: 1 }, { key: 'Gram', label: 'Gram (g)', factor: 0.001 }, { key: 'Bag50', label: 'Bag (50 Kg)', factor: 50 }],
  'Bag (50Kg)':     [{ key: 'Bag50', label: 'Bag (50 Kg)', factor: 50 }, { key: 'Kg', label: 'Kilogram (Kg)', factor: 1 }],
  'Packet (1Kg)':   [{ key: 'Pkt1Kg', label: 'Packet (1 Kg)', factor: 1 }, { key: 'Kg', label: 'Kilogram (Kg)', factor: 1 }],
  'Gram':           [{ key: 'Gram', label: 'Gram (g)', factor: 0.001 }, { key: 'Kg', label: 'Kilogram (Kg)', factor: 1 }],
};

export const getUnitOptions = (baseUnit) => UNIT_OPTIONS_MAP[baseUnit] || [{ key: 'unit', label: baseUnit || 'Unit', factor: 1 }];

export const calcTotal = (price, discount, qty, factor = 1) =>
  parseFloat((Math.max(0, price - discount) * qty * factor).toFixed(2));

const INITIAL_OFFERS_FALLBACK = [];

// ── Offer Engine Helpers ──────────────────────────────────────────────────────
const getActiveOffers = () => {
  const today = new Date().toISOString().split('T')[0];
  const all = getStoredData('AGRO_ERP_OFFERS', INITIAL_OFFERS_FALLBACK);
  return all.filter(o => {
    if (o.status === 'Inactive') return false;
    return today >= o.startDate && today <= o.endDate;
  });
};

const findMatchingOffer = (product, activeOffers) => {
  const byProduct = activeOffers.find(o => o.scope === 'Product' && o.targetId === product.id);
  if (byProduct) return byProduct;
  const byCompany = activeOffers.find(o => o.scope === 'Company' && o.targetId === product.company_id);
  if (byCompany) return byCompany;
  const byCategory = activeOffers.find(o => o.scope === 'Category' && o.targetId === product.category_id);
  if (byCategory) return byCategory;
  return null;
};

const computeOfferDiscount = (offer, unitPrice, quantity) => {
  if (!offer) return { discount: 0, freeQty: 0, offerApplied: null, offerType: null };
  if (offer.type === 'Percentage') {
    return {
      discount: parseFloat(((unitPrice * offer.discountValue) / 100).toFixed(2)),
      freeQty: 0, offerApplied: offer.name, offerType: 'Percentage'
    };
  }
  if (offer.type === 'Fixed') {
    return {
      discount: parseFloat(Math.min(offer.discountValue, unitPrice).toFixed(2)),
      freeQty: 0, offerApplied: offer.name, offerType: 'Fixed'
    };
  }
  if (offer.type === 'BuyXGetY') {
    // Correct formula: for every (X+Y) units, Y are free
    // e.g. Buy 1 Get 1: add 2 → 1 free, add 4 → 2 free
    const cycleSize = (offer.buyQty || 1) + (offer.getQty || 1);
    const freeQty = Math.floor(quantity / cycleSize) * (offer.getQty || 1);
    return {
      discount: 0, freeQty, offerApplied: offer.name, offerType: 'BuyXGetY'
    };
  }
  return { discount: 0, freeQty: 0, offerApplied: null, offerType: null };
};

export function POSProvider({ children, triggerNotificationToast }) {
  const [cart, setCart] = useState([]);
  const DEFAULT_CUST = CUSTOMERS[0] || { id: 'CUST001', _id: 'CUST001', name: 'Walk-in Customer', customer_type: 'Walk-in Customer', outstanding_balance: 0, available_credit: 50000 };
  const [selectedCustomer, setSelectedCustomer] = useState(DEFAULT_CUST);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [billDiscountType, setBillDiscountType] = useState('Amount');
  const [billDiscountValue, setBillDiscountValue] = useState('');

  const handleCustomerChange = (cust) => {
    const targetCust = cust || DEFAULT_CUST;
    setSelectedCustomer(targetCust);
    setCart(prev => prev.map(item => {
      let unitPrice = item.product.retail_price;
      if (targetCust?.customer_type === 'Farmer')     unitPrice = item.product.farmer_price    || item.product.retail_price;
      if (targetCust?.customer_type === 'Dealer')     unitPrice = item.product.dealer_price    || item.product.retail_price;
      if (targetCust?.customer_type === 'Wholesaler') unitPrice = item.product.wholesale_price || item.product.retail_price;
      return { ...item, price: unitPrice, total: calcTotal(unitPrice, item.discount, item.quantity, item.unitFactor) };
    }));
  };

  const addProductToCart = (product, batchOverride = null) => {
    const batch = batchOverride ||
      product.batches?.find(b => b.stock_qty > 0) ||
      product.batches?.[0] || {
        id: 'default', batch_no: 'N/A', stock_qty: 999,
        mfg_date: 'N/A', expiry_date: 'N/A',
        purchase_rate: product.wholesale_price,
        selling_rate: product.retail_price
      };

    const baseName = UNITS.find(u => u.id === product.unit_id)?.name || 'Unit';
    const unitOpts = getUnitOptions(baseName);
    const defUnit = unitOpts[0];

    let unitPrice = product.retail_price;
    if (selectedCustomer?.customer_type === 'Wholesaler') unitPrice = product.wholesale_price || product.retail_price;
    else if (selectedCustomer?.customer_type === 'Dealer')   unitPrice = product.dealer_price   || product.retail_price;
    else if (selectedCustomer?.customer_type === 'Farmer')   unitPrice = product.farmer_price   || product.retail_price;

    // ── Apply active offer ───────────────────────────────────────────────────
    const activeOffers = getActiveOffers();
    const matchedOffer = findMatchingOffer(product, activeOffers);
    
    let qtyToAdd = 1;
    if (matchedOffer && matchedOffer.type === 'BuyXGetY') {
      qtyToAdd = (matchedOffer.buyQty || 1) + (matchedOffer.getQty || 1);
    }

    const offerResult = computeOfferDiscount(matchedOffer, unitPrice, qtyToAdd);

    const existingIndex = cart.findIndex(i => i.product.id === product.id && i.batch.id === batch.id);
    const totalProductStock = product.batches?.reduce((sum, b) => sum + (b.stock_qty || 0), 0) || 0;
    
    if (existingIndex !== -1) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + qtyToAdd;
      
      const otherReq = cart.filter((c, i) => i !== existingIndex && c.product.id === product.id)
                           .reduce((s, c) => s + (c.quantity * c.unitFactor), 0);
      const remainingForThisRow = totalProductStock - otherReq;
      const maxAllowed = Math.floor(Math.max(0, remainingForThisRow) / updated[existingIndex].unitFactor);
      
      if (newQty > maxAllowed) {
        if (triggerNotificationToast) triggerNotificationToast('Out of Stock', `Only ${maxAllowed} ${updated[existingIndex].unitLabel} available in stock.`, 'error');
        return;
      }
      
      updated[existingIndex].quantity = newQty;
      // Recalculate BuyXGetY free qty on quantity change
      if (updated[existingIndex].offerType === 'BuyXGetY' && matchedOffer) {
        const recomputed = computeOfferDiscount(matchedOffer, unitPrice, newQty);
        updated[existingIndex].freeQty = recomputed.freeQty;
      }
      const effectiveQty = updated[existingIndex].offerType === 'BuyXGetY'
        ? Math.max(0, newQty - (updated[existingIndex].freeQty || 0))
        : newQty;
      updated[existingIndex].total = calcTotal(updated[existingIndex].price, updated[existingIndex].discount, effectiveQty, updated[existingIndex].unitFactor);
      setCart(updated);
    } else {
      const currentCartReq = cart.filter(c => c.product.id === product.id)
                                 .reduce((s, c) => s + (c.quantity * c.unitFactor), 0);
      const remainingStock = totalProductStock - currentCartReq;
      if (remainingStock < qtyToAdd || totalProductStock <= 0) {
        if (triggerNotificationToast) triggerNotificationToast('Out of Stock', `Not enough stock available. Only ${remainingStock} left.`, 'error');
        return;
      }

      if (offerResult.offerApplied && triggerNotificationToast) {
        triggerNotificationToast('Offer Applied! 🎉', `"${offerResult.offerApplied}" has been applied to ${product.name}.`, 'success');
      }

      setCart(prev => [...prev, {
        id: `ITEM_${Date.now()}_${Math.random()}`,
        product, batch, batch_no: batch.batch_no,
        mfg_date: batch.mfg_date, expiry_date: batch.expiry_date,
        quantity: qtyToAdd,
        baseUnit: baseName,
        selectedUnit: defUnit.key, unitLabel: defUnit.label, unitFactor: defUnit.factor,
        unitOptions: unitOpts,
        price: unitPrice, taxRate: product.tax_rate,
        discount: offerResult.discount,
        freeQty: offerResult.freeQty,
        offerApplied: offerResult.offerApplied,
        offerType: offerResult.offerType,
        originalPrice: unitPrice,
        total: offerResult.offerType === 'BuyXGetY'
          ? calcTotal(unitPrice, 0, Math.max(0, qtyToAdd - offerResult.freeQty), defUnit.factor)
          : calcTotal(unitPrice, offerResult.discount, qtyToAdd, defUnit.factor)
      }]);
    }
  };

  const updateItem = (index, changes) => {
    setCart(prev => {
      const updated = [...prev];
      const item = { ...updated[index], ...changes };
      // For BuyXGetY, recalculate freeQty and use effective paid qty for total
      if (item.offerType === 'BuyXGetY') {
        const activeOffers = getActiveOffers();
        const matchedOffer = activeOffers.find(o => o.name === item.offerApplied);
        if (matchedOffer) {
          const cycleSize = (matchedOffer.buyQty || 1) + (matchedOffer.getQty || 1);
          item.freeQty = Math.floor(item.quantity / cycleSize) * (matchedOffer.getQty || 1);
        }
        const effectiveQty = Math.max(0, item.quantity - (item.freeQty || 0));
        item.total = calcTotal(item.price, item.discount, effectiveQty, item.unitFactor);
      } else {
        item.total = calcTotal(item.price, item.discount, item.quantity, item.unitFactor);
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleQuantityChange = (index, value) => {
    const qty = parseFloat(value) || 0;
    if (qty <= 0) { removeCartItem(index); return; }
    
    const item = cart[index];
    const totalProductStock = item.product.batches?.reduce((sum, b) => sum + (b.stock_qty || 0), 0) || 0;
    const otherReq = cart.filter((c, i) => i !== index && c.product.id === item.product.id)
                         .reduce((s, c) => s + (c.quantity * c.unitFactor), 0);
    const remainingForThisRow = totalProductStock - otherReq;
    const maxAllowed = Math.floor(Math.max(0, remainingForThisRow) / item.unitFactor);
    
    if (qty > maxAllowed) {
      if (triggerNotificationToast) triggerNotificationToast('Out of Stock', `Only ${maxAllowed} ${item.unitLabel} available in stock.`, 'error');
      updateItem(index, { quantity: maxAllowed });
      return;
    }
    
    updateItem(index, { quantity: qty });
  };

  const handleUnitChange = (index, unitKey) => {
    const item = cart[index];
    const opt = item.unitOptions.find(o => o.key === unitKey) || item.unitOptions[0];
    
    const totalProductStock = item.product.batches?.reduce((sum, b) => sum + (b.stock_qty || 0), 0) || 0;
    const otherReq = cart.filter((c, i) => i !== index && c.product.id === item.product.id)
                         .reduce((s, c) => s + (c.quantity * c.unitFactor), 0);
    const remainingForThisRow = totalProductStock - otherReq;
    const maxAllowed = Math.floor(Math.max(0, remainingForThisRow) / opt.factor);
    
    if (item.quantity > maxAllowed) {
      if (triggerNotificationToast) triggerNotificationToast('Out of Stock', `Only ${maxAllowed} ${opt.label} available in stock.`, 'error');
      updateItem(index, { selectedUnit: opt.key, unitLabel: opt.label, unitFactor: opt.factor, quantity: maxAllowed });
      return;
    }
    
    updateItem(index, { selectedUnit: opt.key, unitLabel: opt.label, unitFactor: opt.factor });
  };

  const handlePriceChange    = (index, v) => updateItem(index, { price:    parseFloat(v) || 0 });
  const handleDiscountChange = (index, v) => updateItem(index, { discount: parseFloat(v) || 0 });
  const removeCartItem       = (index)    => setCart(prev => prev.filter((_, i) => i !== index));

  const resetPOSWorkspace = () => {
    setCart([]);
    setSelectedCustomer(CUSTOMERS[0]);
    setPaymentMethod('Cash');
    setReceivedAmount('');
    setPaymentDetails({});
    setWalkInName('');
    setWalkInPhone('');
    setBillDiscountType('Amount');
    setBillDiscountValue('');
  };

  const subtotal      = cart.reduce((s, i) => s + i.total, 0);
  const gstAmount     = cart.reduce((s, i) => s + (i.total * i.taxRate / 100), 0);
  const totalItemDiscount = cart.reduce((s, i) => s + (i.discount * i.quantity * i.unitFactor), 0);
  const offerSavings  = cart.reduce((s, i) => {
    if (i.offerType === 'Percentage' || i.offerType === 'Fixed') {
      return s + (i.discount * i.quantity * i.unitFactor);
    }
    if (i.offerType === 'BuyXGetY') {
      return s + ((i.freeQty || 0) * i.price * i.unitFactor);
    }
    return s;
  }, 0);
  
  const grossTotal = subtotal + gstAmount;
  const parsedBillDiscount = parseFloat(billDiscountValue) || 0;
  const billDiscountAmount = billDiscountType === 'Percentage' 
      ? (grossTotal * parsedBillDiscount) / 100 
      : parsedBillDiscount;

  const totalDiscount = totalItemDiscount + billDiscountAmount;
  const grandTotal    = Math.max(0, Math.round(subtotal + gstAmount - billDiscountAmount));
  const receivedVal   = parseFloat(receivedAmount) || 0;
  const changeReturn  = Math.max(0, receivedVal - grandTotal);

  return (
    <POSContext.Provider value={{
      cart, setCart,
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
    }}>
      {children}
    </POSContext.Provider>
  );
}

export function usePOSContext() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOSContext must be used within a POSProvider');
  }
  return context;
}
