const Offer = require('../models/Offer');
const { getActiveOffers } = require('../helpers/offerEngine');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const getOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({}).sort({ createdAt: -1 });
    return successResponse(res, 'Offers fetched successfully', offers);
  } catch (error) {
    next(error);
  }
};

const getActiveSchemes = async (req, res, next) => {
  try {
    const offers = await Offer.find({ status: 'Active' });
    const active = getActiveOffers(offers);
    return successResponse(res, 'Active offers fetched successfully', active);
  } catch (error) {
    next(error);
  }
};

const createOffer = async (req, res, next) => {
  try {
    const count = await Offer.countDocuments();
    const code = req.body.code || `OFF-2026-${String(count + 1).padStart(3, '0')}`;

    const offer = await Offer.create({ ...req.body, code });
    return successResponse(res, 'Offer created successfully', offer, 201);
  } catch (error) {
    next(error);
  }
};

const updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!offer) throw new ApiError(404, 'Offer not found');
    return successResponse(res, 'Offer updated successfully', offer);
  } catch (error) {
    next(error);
  }
};

const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) throw new ApiError(404, 'Offer not found');
    return successResponse(res, 'Offer deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOffers,
  getActiveSchemes,
  createOffer,
  updateOffer,
  deleteOffer
};
