const { Schema, default:mongoose } = require('mongoose')

const otpSchema = new Schema({
    email : {
        type: String,
        required: true,
    },
    otp: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now(),
        required: true,
        get: (timestamp) => timestamp.getTime(),
        set: (timestamp) => new Date(timestamp),
        index: { expires: '4m'}  
    }
})

const Otp = mongoose.model('Otp', otpSchema)
module.exports = Otp