const { Schema, default:mongoose} = require('mongoose')

const categoryOfferSchema = new Schema({
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },price: {
        type: Number,
        required: true
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    startDate: { 
        type: Date, 
        required: true 
    },endDate: { 
        type: Date, 
        required: true 
    },
})

const CategoryOffer = mongoose.model('CategoryOffer', categoryOfferSchema) 
module.exports = CategoryOffer