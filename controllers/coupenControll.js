const Coupen = require('../models/coupenModel')
const validateMongodbID = require('../utils/validateMongodbID')
const asyncHandler = require('express-async-handler')

const createCoupen = asyncHandler(async (req,res) =>{
    try {
        const newCoupen = await Coupen.create(req.body)
        res.json(newCoupen)
    } catch (error) {
        console.log(error)
    }
})

const getAllCoupens = asyncHandler(async (req,res) =>{
    try {
        const coupens = await Coupen.find()
        res.json(coupens)
    } catch (error) {
        console.log(error)
    }
})

const updateCoupens = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const coupens = await Coupen.findByIdAndUpdate(id,
            req.body,
            { 
                new: true

            }
        )
        res.json(coupens)
    } catch (error) {
        console.log(error)
    }
})

const deleteCoupens = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const coupens = await Coupen.findByIdAndDelete(id)
        res.json(coupens)
    } catch (error) {
        console.log(error)
    }
})

module.exports = { 
                createCoupen,
                getAllCoupens,
                updateCoupens,
                deleteCoupens
                }