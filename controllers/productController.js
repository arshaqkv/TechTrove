const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const User = require('../models/userModel')
const Offer = require('../models/offerModel')
const Order = require('../models/orderModel')
const Cart = require('../models/cartModel')
const asyncHandler = require('express-async-handler')
const slugify = require('slugify')
const validateMongoDbId = require('../utils/validateMongodbID')
const { validationResult } = require('express-validator')




//create product page
const loadCreateProduct = asyncHandler( async(req,res) =>{  
    try {
        const categories = await Category.find({ isDeleted: false});
        return res.status(201).render('addProduct', { categories });
    } catch (error) {
        throw new Error(error)
    }
})



const createProduct = asyncHandler(async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        let { title, slug } = req.body;
        if (title) {
            let productSlug = slug || slugify(title, { lower: true, strict: true });
            // Check if the slug already exists, if it does, append a number until it's unique
            let counter = 1;  
            while (await Product.findOne({ slug: productSlug })) {
                productSlug = `${slug || slugify(title, { lower: true, strict: true })}-${counter}`;
                counter++;
            }
            req.body.slug = productSlug;
        }
        console.log(req.body)   
        console.log(req.files);
        // req.body.images now contains the paths to the resized images
        const newProductData = {
            ...req.body, // Include other fields from req.body
        }; 
        const newProduct = await Product.create(newProductData);
        return res.status(201).json({success: true})
    } catch (error) {
        console.log(error)
        // return res.status(500).json({ error: 'An error occurred while creating the product' });
    }
});  


//get all products
const getAllProducts = asyncHandler(async (req, res) => {
    const user = req.user
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Number of products per page
    const skip = (page - 1) * limit;

    try {
        const count = await Product.countDocuments({ isDeleted: false });
        const totalPages = Math.ceil(count / limit);

        const products = await Product.find({ isDeleted: false })
            .populate('category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

       

        const pagination = {
            totalPages,
            page,
            limit,
            count,
            pages: Array.from({ length: totalPages }, (_, i) => ({ page: i + 1, active: i + 1 === page })),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };

        res.render('allProducts', { user, products, pagination,count });
    } catch (err) {
        throw new Error(err);
    }
});

//get a product

const getProduct = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    const { prodId } = req.params
    validateMongoDbId(prodId)
    try {
        const user = await User.findById(_id)
        const product = await Product.findById(prodId).populate('category')
        let cart = await Cart.findOne({ orderby: user._id }).populate('products.product').exec() || null
        const recommendedProduct = await Product.find({
            category: product.category._id,
            _id: {$ne: product._id}
        }).limit(8)
        
        
        const alreadyAddedProduct = user.wishlist.find((id) => id.toString() === prodId)

        const breadcrumbs = [
            { name: 'Home', url: '/home'},  
            { name: 'Shop', url: '/shop'},
            { name: product.title, url: `/product/${prodId}`}
        ]

        const { originalPrice, offerPrice, discountPercentage } = await product.getEffectivePrice();

        res.status(201).render('productDetails', { user, cart, product, recommendedProduct, breadcrumbs, alreadyAddedProduct, originalPrice, offerPrice,
            discountPercentage })
    } catch (error) {
        console.log(error)
    }
})

const loadUpdateProduct = asyncHandler( async(req,res) =>{
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const categories = await Category.find({ isDeleted: false});
        const product = await Product.findById(id); 
        
        res.status(201).render('editProduct', {product,categories});
    } catch (error) {
        console.log(error)
    }
})

//update a product
const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        let { title } = req.body;
        let productSlug = req.body.slug || slugify(title, { lower: true, strict: true });

        // Check if the slug already exists, if it does, append a number until it's unique
        let counter = 1;
        while (await Product.findOne({ slug: productSlug, _id: { $ne: id } })) {
            productSlug = `${req.body.slug || slugify(title, { lower: true, strict: true })}-${counter}`;
            counter++;
        }
        
        req.body.slug = productSlug;

        // Prepare updated product data
        let newProductData = { ...req.body };

        // Handle existing images
        if (req.body.existingImages) {
            newProductData.images = req.body.existingImages;
        }
          
        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(id, newProductData, {
            new: true,
        });

        res.status(201).json({sucess: true}); 
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).send('Failed to update product');
    }
});


const deleteImage = asyncHandler(async(req,res) =>{
    const { productId } = req.params;
    const { imagePath } = req.body;  
    console.log(imagePath);
    try {
        const product = await Product.findById(productId);

        // Remove imagePath from product.images array
        product.images = product.images.filter(img => img !== imagePath); 

        // Save updated product to database
        await product.save();

        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
})


//delete a product
const deleteProduct = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try { 
        const deletedProduct = await Product.findByIdAndUpdate(id,
            { isDeleted: true},
            {new: true}
        )
        res.redirect('/product/index') 
    } catch (err) {
        throw new Error(err)
    }
})

const addToWishList = asyncHandler(async (req,res) =>{
    const { _id } = req.user
    const { prodId } = req.body
    try {
        const user = await User.findById(_id)
        const alreadyAddedProduct = user.wishlist.find((id) => id.toString() === prodId)
        if(alreadyAddedProduct){
            const user = await User.findByIdAndUpdate(_id,
                { 
                    $pull: { wishlist: prodId }    
                },
                {
                    new: true
                }
            )
            res.json(user)
           
        }else{
            const user = await User.findByIdAndUpdate(_id,
                { 
                    $push: { wishlist: prodId }
                },
                {
                    new: true
                }
            )
            res.json(user)
            
        }
    } catch (error) { 
        console.log(error)
    }
}) 

//wishlist page
const loadWishlist = asyncHandler(async (req, res) => {
    const user = req.user;
    const { _id } = user;
    validateMongoDbId(_id);

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    try {
        const userWishlist = await User.findById(_id).populate('wishlist');
        let cart = await Cart.findOne({ orderby: user._id }).populate('products.product').exec() || null
        const count = userWishlist.wishlist.length;
        const totalPages = Math.ceil(count / limit);
        const skip = (page - 1) * limit;

        const wishlist = await Promise.all(
            userWishlist.wishlist.slice(skip, skip + limit).map(async product => {

                const { originalPrice, offerPrice, discountPercentage } = await product.getEffectivePrice();
                return {
                    ...product.toObject(),
                    effectivePrice: offerPrice !== null ? offerPrice : originalPrice,
                    originalPrice,
                    discountPercentage
                };
            })
        );

        const pagination = {
            totalPages,
            page,
            count,
            pages: Array.from({ length: totalPages }, (_, i) => ({ page: i + 1, active: i + 1 === page })),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };

        res.render('wishlist', { user, cart, wishlist, pagination,count });
    } catch (error) {  
        console.log(error);
    }
});

const getTrendingItems = asyncHandler(async(req,res) =>{
    const user = req.user
    try {
        const trendingProducts = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.product',
                    count: {$sum: '$products.count'}  
                }
            },
            {
                $sort: { 'count': -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'productCategory'  
                }
            },
            {
                $unwind: '$productCategory'
            }
        ]) 
        
        const updatedProducts = await Promise.all(trendingProducts.map(async (product) => {

            // Get the effective price using the method defined in the Product schema
            const productDoc = new Product(product.productDetails);
            const { originalPrice, offerPrice, discountPercentage } = await productDoc.getEffectivePrice();

            // Add the effective price details to the product object
            product.productDetails.originalPrice = originalPrice;
            product.productDetails.offerPrice = offerPrice;
            product.productDetails.discountPercentage = discountPercentage;

            return product;
        }));

        const trendingCategories = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.product',
                    count: {$sum: '$products.count'}
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $group: {
                    _id: '$productDetails.category',
                    count: {$sum: '$count'}
                }
            },
            {
                $sort: {'count': -1}
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            {
                $unwind: '$categoryDetails'
            }
        ])

        const trendingBrands = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $unwind: '$products'
            },
            { 
                $group: { 
                    _id: "$products.product", 
                    count: { $sum: "$products.count" } 
                }
            },
            { 
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { 
                $unwind: "$productDetails" 
            },
            {
                $group: {
                    _id: '$productDetails.brand',
                    count: {$sum: '$count'}
                }
            },
            {
                $sort: {'count': -1}
            },
            {
                $limit: 10
            }   
        ])

        res.render('trending', {user, trendingProducts, trendingCategories, trendingBrands})
    } catch (error) {
        console.log(error)
    }
})


//rating of product
const rating = asyncHandler(async (req, res) =>{
    const { id } = req.params
    const { star, prodId } = req.body
    try {
        const product = Product.findById(prodId)
        let alreadyRated = product.ratings.find((userId) =>userId.postedBy.toString() === id.toString())
        if(alreadyRated){
            const updateRating = await Product.updateOne(
                { 
                    rating: {$elemMatch: alreadyRated}
                },
                { 
                    $set: { "ratings.$.star": star}
                }, 
                {
                    new: true
                }
            )
        }else{
            const rateProduct = await Product.findByIdAndUpdate(prodId,
                { $push: {
                    ratings: {
                        star: star,
                        postedBy: _id
                            }
                    }
                },
                {
                    new: true
                }
            )
        }
        res.send(product)
    } catch (error) {
        console.log(error)
    } 
})

module.exports = {
    loadCreateProduct,
    createProduct,
    getAllProducts,
    getProduct,
    loadUpdateProduct,
    updateProduct,
    deleteProduct,
    rating,
    addToWishList,
    loadWishlist,
    getTrendingItems,
    deleteImage
} 