const { Schema, default: mongoose } = require('mongoose')
const Offer = require('../models/offerModel')

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
    },
    featured: {
        type: Boolean,
        default: false
    },
    popularity: {
        type: Number,
        default: 0
    }

},
{
    timestamps: true
})


productSchema.methods.getEffectivePrice = async function() {
    const currentDate = new Date();
    let offerPrice = null;
    let discountPercentage = null;

    // Check product-specific offers
    const productOffer = await Offer.findOne({
        offerTarget: 'Product',
        targetId: this._id,
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate }
    });

    if (productOffer) {
        offerPrice = this.price - (this.price * (productOffer.discountPercentage / 100));
        discountPercentage = productOffer.discountPercentage;
    } else {
        // Check category-specific offers
        const categoryOffer = await Offer.findOne({
            offerTarget: 'Category',
            targetId: this.category._id,
            startDate: { $lte: currentDate },
            expiryDate: { $gte: currentDate }
        });

        if (categoryOffer) {
            offerPrice = this.price - (this.price * (categoryOffer.discountPercentage / 100));
            discountPercentage = categoryOffer.discountPercentage;
        }
    }

    return {
        originalPrice: this.price,
        offerPrice,
        discountPercentage
    };
};

const Product = mongoose.model("Product", productSchema)
module.exports = Product

