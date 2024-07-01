const Coupon = require('../models/couponModel')
const validateMongodbID = require('../utils/validateMongodbID')
const asyncHandler = require('express-async-handler')

const createCoupon = asyncHandler(async (req,res) =>{
    try {
        const newCoupen = await Coupon.create(req.body)
        res.redirect('/coupon')
    } catch (error) {
        console.log(error)
    }
})

const loadCreateCoupon = asyncHandler(async (req,res) =>{
    try {
        res.render('addCoupon')
    } catch (error) {
        console.log(error)
    }
})

const getAllCoupons = asyncHandler(async (req,res) =>{
    try {
        const coupons = await Coupon.find()
        res.render('coupon', { coupons })
    } catch (error) {
        console.log(error)
    }
})

const loadUpdateCoupons = asyncHandler(async (req,res) =>{
    const { id } =req.params
    try {
        const coupons = await Coupon.findById(id)
        res.render('updateCoupon', { coupons })
    } catch (error) {
        console.log(error)
    }
})

const updateCoupons = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const coupon = await Coupon.findByIdAndUpdate(id,
            req.body,
            { 
                new: true

            }
        )
        res.redirect('/coupon')
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