const { Schema, default:mongoose} = require('mongoose')

const orderSchema = new Schema({
    products: [
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        },
        count: {
            type: Number
        },
    }
    ],
    totalPrice: {
      type: Number,
      required: true
    },
    paymentIntent: {
        type: String,
        required: true
    },
    orderStatus: {
        type: String, 
        default: "Order Placed",
        enum: ["Order Placed", "Processing", "Dispatched", "Delivered", "Cancelled"]
    },
    orderby: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    razorpayOrderId: String, 
    },
    {
        timestamps: true
    }
)


const Order = mongoose.model('Order', orderSchema)
module.exports = Order
