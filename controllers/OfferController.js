const asyncHandler = require('express-async-handler')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Offer = require('../models/offerModel');
const { validationResult } = require('express-validator')
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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }
        const existingOffer = await Offer.findOne({targetId})
        if(existingOffer){
            return res.status(400).json({ success: false, message: 'Offer already exists.' })
        }

        const offer = new Offer({
            offerTarget,
            targetId,
            discountPercentage,
            startDate, 
            expiryDate
        })

        await offer.save()
        return res.status(200).json({ 
            message: "Offer created successfully!"
        });   
    } catch (error) {
        console.log(error)
    }
})

const getAllOffers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 3 

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
            limit,
            count,
            pages: Array.from({ length: totalPages }, (_, i) => ({ page: i + 1, active: i + 1 === page })),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };

        res.render('offers', { offers: offerDetails, pagination, count });
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
        const products = await Product.find() 
        const categories = await Category.find()
        console.log(offer)
        res.render('updateOffer', { offer, products, categories }) 
    } catch (error) {
        console.log(error)
    }
})

const updateOffer = asyncHandler(async (req,res) =>{
    const { id } = req.params
    const { targetId } = req.body
    console.log(req.body)
    try {
        const existingOffer = await Offer.findOne({targetId})
        if(existingOffer && existingOffer._id.toString() !== id){
            return res.status(400).json({ success: false, message: 'Offer already exists.' })
        }

        const coupon = await Offer.findByIdAndUpdate(id,
            req.body, 
            { 
                new: true 

            }
        )
        return res.status(200).json({ 
            message: "Offer updated successfully!"
        }); 
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
                    loadUpdateOffer,
                    updateOffer
                }
