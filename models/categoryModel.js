const { Schema, default:mongoose} = require('mongoose')

const catogorySchema = new Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    isDeleted:
    {
        type: Boolean,
        default: false
    },
    offer: { 
        type: Schema.Types.ObjectId, 
        ref: 'Offer' 
    }
    },
    {
        timestamps: true
    }
)

const Category = mongoose.model('Category', catogorySchema)
module.exports = Category

