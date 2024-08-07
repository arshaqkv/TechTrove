const { Schema, default:mongoose} = require('mongoose')

const bannerSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    } 
})

const Banner = mongoose.model('Banner', bannerSchema)
module.exports = Banner