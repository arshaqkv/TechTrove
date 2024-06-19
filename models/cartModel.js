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
        price: {
            type: Number
        }
    }
    ],
    cartTotal: {
        type: Number
    },
    totalAfterDiscount: {
        type: Number
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
