const { Schema, default: mongoose } = require('mongoose')


let productSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    }, 
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category"
    },
    brand: {
        type: String,
        enum: ["Apple", "Samsung", "Lenovo","Huawei","Oppo","Oneplus"]
    },
    images: {
        type: Array
    },
    stock_count: {
        type: Number,
        require: true
    },
    sold: {
        type: Number,
        default: 0
    },
    // variant: {
    //     type: Schema.Types.ObjectId,
    //     ref: "Product_variant"
    // },
    isDeleted: {
        type: Boolean,
        default: false
    },
    ratings: [
        {
            star: { type: Number },
            review: { type: String},
            postedBy: {type: Schema.Types.ObjectId, ref: "User"}
        }
    ],
    totalRating: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
})


const Product = mongoose.model("Product", productSchema)
module.exports = Product

