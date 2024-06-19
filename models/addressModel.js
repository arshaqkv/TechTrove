const { Schema, default:mongoose} = require('mongoose')

const addressSchema = new Schema({
    addressLine1: {
        type: String,
        required: true
    },
    adrressLine2: {
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
    }
})

const Address = mongoose.model('Address', addressSchema)
module.exports = Address
