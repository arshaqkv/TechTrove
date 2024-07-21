const { Schema, default:mongoose} = require('mongoose')

const cartSchema = new Schema({
    products: [
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        },
        count: {
            type: Number
        },
        originalPrice: {
            type: Number,
            required: true
        },
        finalPrice: {
            type: Number,
            required: true
        }
    }
    ],
    cartTotal: {
        type: Number
    },
    totalAfterDiscount: {
        type: Number,
        default: 0
    },
    orderby: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
    },
    {
        timestamp: true
    }
)

const Cart = mongoose.model('Cart', cartSchema)
module.exports = Cart
