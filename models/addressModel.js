const { Schema, default:mongoose} = require('mongoose')

const addressSchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: Number
    },
    addressLine1: {
        type: String,
        required: true
    },
    addressLine2: { 
        type: String,
        required: true
    }, 
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pinCode: {
        type: Number,
        required: true
    },
    default: { 
        type: Boolean, 
        default: false 
    }},
    {
    timestamps: true
    }
)

const Address = mongoose.model('Address', addressSchema)
module.exports = Address
