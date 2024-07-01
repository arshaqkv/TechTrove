const { Schema, default:mongoose} = require('mongoose')

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    expiry: {
        type: Date,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    minBill:{
        type:Number,
        required:true
    },
    status: {
        type: String
    },
    usedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]},
    { 
        timestamps: true
    }
)



const Coupon = mongoose.model('Coupon', couponSchema)
module.exports = Coupon

