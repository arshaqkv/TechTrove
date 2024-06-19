const { Schema, default:mongoose} = require('mongoose')

const coupenSchema = new Schema({
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
    }},
    {
        timestamps: true
    }
)

const Coupen = mongoose.model('Coupen', coupenSchema)
module.exports = Coupen

