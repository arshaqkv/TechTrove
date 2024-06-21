const Product = require('../models/productModel')
const asyncHandler = require('express-async-handler')

const incrementPopularity = asyncHandler(async(req, res, next) =>{
    try {
        const { id } = req.params
        await Product.findByIdAndUpdate(id, { $inc: { popularity: 1 } });
        next();
    } catch (error) {
        console.log(error)
    }
}
)
module.exports = incrementPopularity;