const asyncHandler = require('express-async-handler')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Offer = require('../models/offerModel');
const validateMongoDbId = require('../utils/validateMongodbID')

const loadCreateOffer = asyncHandler(async (req,res)=>{
    const user = req.user
    try {
        const products = await Product.find({isDeleted: false}).select('_id title');
        const categories = await Category.find({isDeleted: false}).select('_id title'); 
        res.render('addOffer', {user, products, categories})
    } catch (error) {
        console.log(error) 
    }
})

const createOffer = asyncHandler(async (req,res) =>{
    const { offerTarget, targetId, discountPercentage, startDate, expiryDate } = req.body
    console.log(req.body)
    try {
        const offer = new Offer({
            offerTarget,
            targetId,
            discountPercentage,
            startDate, 
            expiryDate
        })

        await offer.save()
        res.redirect('/offers')
    } catch (error) {
        console.log(error)
    }
})

const getAllOffers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Number of offers per page

    try {
        const count = await Offer.countDocuments();
        const totalPages = Math.ceil(count / limit);
        const skip = (page - 1) * limit;

        const offers = await Offer.find()
            .skip(skip) 
            .limit(limit);

        const offerDetails = await Promise.all(offers.map(async (offer) => {
            const targetName = await lookupTargetName(offer.offerTarget, offer.targetId);
            return { ...offer.toObject(), targetName };
        }));

        const pagination = {
            totalPages,
            page,
            count,
            pages: Array.from({ length: totalPages }, (_, i) => ({ page: i + 1, active: i + 1 === page })),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };

        res.render('offers', { offers: offerDetails, pagination });
    } catch (error) {
        console.log(error);
    }
});


const lookupTargetName = async (offerTarget, targetId) => {
    if (offerTarget === 'Product') {
        const product = await Product.findById(targetId);
        return product ? product.title : 'Unknown';
    } else if (offerTarget === 'Category') {
        const category = await Category.findById(targetId);
        return category ? category.title : 'Unknown';
    }
    return 'Unknown';
};

const loadUpdateOffer = asyncHandler(async (req,res) =>{
    const { id } =req.params
    try {
        const offer = await Offer.findById(id)
        res.render('updateOffer', { offer })
    } catch (error) {
        console.log(error)
    }
})


const deleteOffer = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        await Offer.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Failed to delete offer' });
    }
})

module.exports = {
                    loadCreateOffer,
                    createOffer,
                    getAllOffers,
                    deleteOffer,
                    loadUpdateOffer
                }
