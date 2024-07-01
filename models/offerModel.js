const { Schema, default:mongoose} = require('mongoose')

const offerSchema = new Schema({
    offerTarget: {
        type: String,
        enum: ['Product', 'Category'],
        required: true
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'offerTarget'
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date, 
        required: true
    }
});

const Offer = mongoose.model('Offer', offerSchema)
module.exports = Offer

