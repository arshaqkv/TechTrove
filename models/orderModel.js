const { Schema, default:mongoose} = require('mongoose')


const orderSchema = new Schema({
    orderId: {
        type: String,
        required: true, 
        unique: true
    },
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
        enum: ["Pending","Order Placed", "Processing", "Dispatched", "Delivered", "Cancelled", "Returned"]
    },
    orderby: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    razorpayOrderId: {
        type: String
    },
    feedback: {
        type: String     
    }
    // paymentStatus: {
    //     type: String,
    //     default: 'Pending'
    // }
    },
    {
        timestamps: true
    }
)


const Order = mongoose.model('Order', orderSchema)
module.exports = Order
