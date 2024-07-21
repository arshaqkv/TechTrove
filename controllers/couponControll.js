const Coupon = require('../models/couponModel')
const validateMongodbID = require('../utils/validateMongodbID')
const asyncHandler = require('express-async-handler')
const { validationResult } = require('express-validator')
const moment = require('moment');

const loadCreateCoupon = asyncHandler(async (req,res) =>{
    try {
        res.render('addCoupon')
    } catch (error) {
        console.log(error)
    }
})

const createCoupon = asyncHandler(async (req,res) =>{
    const {code, discount, minBill} = req.body
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        const existingCoupon = await Coupon.findOne({code})
        

        const newCoupen = await Coupon.create(req.body)
        res.status(201).json({success: true})
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while creating the coupon' });
    }
})


const getAllCoupons = asyncHandler(async (req,res) =>{
    const page = parseInt(req.query.page) || 1;
    const limit = 10 

    try {
        const count = await Coupon.countDocuments(); 
        const totalPages = Math.ceil(count / limit);
        const skip = (page - 1) * limit;

        const coupons = await Coupon.find()
            .skip(skip) 
            .limit(limit);


        const pagination = {
            totalPages,
            page,
            limit,
            count,
            pages: Array.from({ length: totalPages }, (_, i) => ({ page: i + 1, active: i + 1 === page })),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
        res.render('coupon', { coupons, pagination, count})
    } catch (error) {
        console.log(error)
    }
})

const loadUpdateCoupons = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const coupons = await Coupon.findById(id)
        res.render('updateCoupon', { coupons })
    } catch (error) {
        console.log(error)
    }
})

const updateCoupons = asyncHandler(async (req,res) =>{
    const { id } = req.params
    const { code } = req.body
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }
        const existingCoupon = await Coupon.findOne({code})
        if(existingCoupon && existingCoupon._id.toString() !== id){
            return res.status(400).json({ success: false, message: 'Coupon code already exists.' })
        }

        const coupon = await Coupon.findByIdAndUpdate(id,
            req.body, 
            { 
                new: true

            }
        )
        res.status(201).json({success: true})
    } catch (error) {
        console.log(error)
    }
})

const deleteCoupons = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const coupon = await Coupon.findByIdAndDelete(id)
        res.status(200).json({ success: true, message: 'Address deleted successfully' }); 
    } catch (error) {
        console.log(error)
    }
})

module.exports = { 
                loadCreateCoupon,
                createCoupon,
                getAllCoupons,
                loadUpdateCoupons,
                updateCoupons,
                deleteCoupons
                }