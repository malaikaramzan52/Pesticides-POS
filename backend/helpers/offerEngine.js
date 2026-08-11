/**
 * Server-side Offer Evaluation Engine
 * Exact mirror of frontend POSContext offer calculation rules.
 */

const getActiveOffers = (offers) => {
  const today = new Date().toISOString().split('T')[0];
  return offers.filter(o => {
    if (o.status === 'Inactive') return false;
    return today >= o.startDate && today <= o.endDate;
  });
};

const findMatchingOffer = (product, activeOffers) => {
  // Scope priority: Product > Company > Category
  const prodId = product._id ? product._id.toString() : product.id;
  const compId = product.company_id ? product.company_id.toString() : '';
  const catId  = product.category_id ? product.category_id.toString() : '';

  const byProduct = activeOffers.find(o => o.scope === 'Product' && o.target_id.toString() === prodId);
  if (byProduct) return byProduct;

  const byCompany = activeOffers.find(o => o.scope === 'Company' && o.target_id.toString() === compId);
  if (byCompany) return byCompany;

  const byCategory = activeOffers.find(o => o.scope === 'Category' && o.target_id.toString() === catId);
  if (byCategory) return byCategory;

  return null;
};

const computeOfferDiscount = (offer, unitPrice, quantity) => {
  if (!offer) return { discount: 0, freeQty: 0, offerApplied: null, offerType: null };

  if (offer.type === 'Percentage') {
    const discount = parseFloat(((unitPrice * offer.discountValue) / 100).toFixed(2));
    return {
      discount,
      freeQty: 0,
      offerApplied: offer.name,
      offerType: 'Percentage'
    };
  }

  if (offer.type === 'Fixed') {
    const discount = parseFloat(Math.min(offer.discountValue, unitPrice).toFixed(2));
    return {
      discount,
      freeQty: 0,
      offerApplied: offer.name,
      offerType: 'Fixed'
    };
  }

  if (offer.type === 'BuyXGetY') {
    const cycleSize = (offer.buyQty || 1) + (offer.getQty || 1);
    const freeQty = Math.floor(quantity / cycleSize) * (offer.getQty || 1);
    return {
      discount: 0,
      freeQty,
      offerApplied: offer.name,
      offerType: 'BuyXGetY'
    };
  }

  return { discount: 0, freeQty: 0, offerApplied: null, offerType: null };
};

module.exports = {
  getActiveOffers,
  findMatchingOffer,
  computeOfferDiscount
};
