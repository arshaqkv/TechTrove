const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const User = require('../models/userModel')
const asyncHandler = require('express-async-handler')
const slugify = require('slugify')
const validateMongoDbId = require('../utils/validateMongodbID')


//create product page
const loadCreateProduct = asyncHandler( async(req,res) =>{
    try {
        const categories = await Category.find({ isDeleted: false});
        return res.status(201).render('addProduct', { categories });
    } catch (error) {
        throw new Error(error)
    }
})

//create products
const createProduct = asyncHandler( async(req,res) =>{
    try {
        let { title, slug } = req.body
        if(title){
            let productSlug = slug || slugify(title, { lower: true, strict: true });
            // Check if the slug already exists, if it does, append a number until it's unique
            let counter = 1;
            while (await Product.findOne({ slug: productSlug })) {
                productSlug = `${slug || slugify(title, { lower: true, strict: true })}-${counter}`;
                counter++;
            }
            req.body.slug = productSlug
        }
        const images = req.files.map(file => file.path); 
        const newProductData = {
            ...req.body, // Include other fields from req.body
            images: images // Add the images field
        };
        const newProduct = await Product.create(newProductData)
        return res.redirect('/product/index') 
    } catch (err) {
        throw new Error(err)
    }
})

//get all products
const getAllProducts = asyncHandler(async (req,res) =>{
    try {
        const findAllProducts = await Product.find({isDeleted: false}).populate('category').exec()
        findAllProducts.forEach(product => {
            // Adjust the path if necessary
            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')) // Replace backslashes with forward slashes
            }
        });
        
        return res.status(200).render('allProducts', { products: findAllProducts })
    } catch (err) {
        throw new Error(err)
    }
})

//get a product

const getProduct = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    const { prodId } = req.params
    validateMongoDbId(prodId)
    try {
        const user = await User.findById(_id)
        const product = await Product.findById(prodId).populate('category')
        // adjusting path ...correcting exact path
        if (product.images && Array.isArray(product.images)) {
            product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')) // Replace backslashes with forward slashes
        }
        const recommendedProduct = await Product.find({
            category: product.category._id,
            _id: {$ne: product._id}
        }).limit(8)
        
        recommendedProduct.forEach(product => {
            // Adjust the path if necessary
            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')) // Replace backslashes with forward slashes
            }
        });
        
        const alreadyAddedProduct = user.wishlist.find((id) => id.toString() === prodId)

        const breadcrumbs = [
            { name: 'Home', url: '/dashboard'},  
            { name: product.title, url: `/product/${prodId}`}
        ]
        
        res.status(201).render('productDetails', { user, product, recommendedProduct, breadcrumbs, alreadyAddedProduct })
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
        
        if (product.images && Array.isArray(product.images)) {
            product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')) // Replace backslashes with forward slashes
        }
        res.status(201).render('editProduct', {product,categories});
    } catch (error) {
        console.log(error)
    }
})

//update a product
const updateProduct = asyncHandler(async (req,res) =>{
    const { id } = req.params
    validateMongoDbId(id)
    try {
        let { title, slug } = req.body
        if(title){
            let productSlug = slug || slugify(title, { lower: true, strict: true });
            // Check if the slug already exists, if it does, append a number until it's unique
            let counter = 1;
            while (await Product.findOne({ slug: productSlug })) {
                productSlug = `${slug || slugify(title, { lower: true, strict: true })}-${counter}`;
                counter++;
            }
            req.body.slug = productSlug
        } 
        let newProductData = { ...req.body };

        if (req.files && req.files.length > 0) {
            const images = req.files.map(file => file.path);
            newProductData.images = images;
        }
        const updatedProduct = await Product.findByIdAndUpdate( id , newProductData ,{
            new: true,
        })
        res.redirect('/product/index')
    } catch (err) { 
        throw new Error(err)
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
const loadWishlist = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    validateMongoDbId(_id)
    try {
        const userWishlist = await User.findById(_id).populate('wishlist')
        const wishlist = userWishlist.wishlist
        wishlist.forEach(product => {
            if (product.images && Array.isArray(product.images)) {
                // Replace backslashes with forward slashes and remove 'public' from the path
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, ''));
            }
        });
        res.render('wishlist', { user, wishlist })
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

//upload images
// const uploadImages = asyncHandler(async (req,res) =>{
//     const { id } = req.params
//     const files = req.files
//     console.log(files)
// })

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
    loadWishlist
} 