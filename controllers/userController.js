const User = require('../models/userModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Cart = require('../models/cartModel')
const Address = require('../models/addressModel')
const Order = require('../models/orderModel')
const Coupon = require('../models/couponModel')
const Otp = require('../models/otpModel')
const asyncHandler = require('express-async-handler')
const { generateToken } = require('../config/jwToken')
const { validationResult } = require('express-validator')
const validateMongoDbId = require('../utils/validateMongodbID')
const bcrypt = require('bcrypt')
const mailer = require('../helpers/nodemailer')
const { oneMinuteExpiry, fiveMinuteExpiry } = require('../helpers/otpValidate')
const moment = require('moment')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET 
});


//home page
const loadDashboard = asyncHandler(async (req, res) => {

    try {
        const filterParams = req.query.filter || {};
        const sortParam = req.query.sort || '';

        const filter = { isDeleted: false };

        if (filterParams.category) {
            const category = await Category.findOne({ title: filterParams.category, isDeleted: false }).exec();
            filter.category = category ? category._id : null;
        }

        if (filterParams.brand) {
            filter.brand = { $in: filterParams.brand.split(',') };
        }

        if (filterParams.price) {
            const price = parseInt(filterParams.price);
            filter.price = { $lte: price };
        }

        if (filterParams.search) {
            filter.title = { $regex: filterParams.search, $options: 'i' };
        }

        let sort = {};

        switch (sortParam) {
            case 'price-asc':
                sort.price = 1;
                break;
            case 'price-desc':
                sort.price = -1;
                break;
            case 'rating':
                sort.rating = -1;
                break;
            case 'featured':
                sort.featured = -1; 
                break;
            case 'new-arrivals':
                sort.createdAt = -1; 
                break;
            case 'a-z':
                sort.title = 1;
                break;
            case 'z-a':
                sort.title = -1;
                break;
            default:
                sort.popularity = -1; 
                break;
        }

        const user = req.user
        const [products, categories] = await Promise.all([
            Product.find(filter).populate('category').sort(sort).exec(),
            Category.find({ isDeleted: false }).exec()
        ]);

        const processedProducts = await Promise.all(products.map(async (product) => {
            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')); // Replace backslashes with forward slashes
            }
            const { originalPrice, offerPrice, discountPercentage } = await product.getEffectivePrice();
            return {
                ...product.toObject(),
                originalPrice,
                offerPrice,
                discountPercentage
            };
        }));
            
        console.log(processedProducts.offerPrice)
        return res.render('userDashboard', { user, products: processedProducts });
        
    } catch (error) {
        console.log(error);
    }
});



// Registration page
const userSignup =  asyncHandler(async (req, res) => {
    try {
        res.render('signup');
    } catch (error) {
        throw new Error(error)
    } 
});


//Register a user
const createUser = asyncHandler(async (req,res) =>{
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(400).render('signup',{
            errors: errors.mapped(), ...req.body 
        }); 
        }

        const { email, name, password, phone } = req.body
        const existingUser = await User.findOne({email: email}) 
        if(existingUser){
            //user already exists
            console.log("************User Already Exists")
            return res.status(400).render('signup',{ error: "User Already Exists"});
        }
        sendOtp({ email, name },res)
        
        return res.status(201).render('otpVerification', {email, name, password, phone});
    } catch (error) {
        console.error(error);
        return res.status(500).render('signup', { error: 'An error occurred during signup' });
    }
});

// const sendOtp = asyncHandler(async ({ email, _id}, res) =>{
const sendOtp = asyncHandler(async ({ email, name }, res) =>{
    try {
        //generate otp
        const g_otp = await Math.floor(100000 + Math.random() * 900000)

        const currDate = new Date()
        const otpEntry = await Otp.findOneAndUpdate(
            { email: email },
            { otp: g_otp, timestamp: new Date(currDate.getTime())},
            { upsert: true, new: true, setDefaultsOnInsert: true} 
        )
        
        const message = '<h2>Hi '+ name +' , Welcome to TechTrove </h2>,<p>Please confirm your OTP</p> <br> Here is your OTP code: <h4></p>'+ g_otp +' </h4>'
        mailer.sendVerificationMail( email, 'Otp Verification code', message) 
        
    } catch (error) {
        throw new Error(error)
    } 
})

const resendOtp = asyncHandler(async (req,res) =>{
    try {
        const { email, name, password, phone } = req.body
        // const findUser = await User.findOne({email})
        sendOtp({ email },res)
        return res.status(201).render('otpVerification', {email, name, password, phone});
    } catch (error) {
        throw new Error(error)
    }

})


const verifyOtp = asyncHandler(async (req, res) =>{ 
    try {
        const { email, otp, name, password, phone } = req.body;
        const otpData = await Otp.findOne({ email, otp })
        if(!otpData){
            return res.status(400).render('otpVerification', { email, name, password, phone, error: "You entered wrong otp"})
        }


        const oldOtp = await oneMinuteExpiry( otpData.timestamp )
        if(oldOtp){
            return res.status(400).render('otpVerification', { email, name, password, phone, error: "Otp is not valid" })
        }

        const user = new User({ name, email, password, phone, isVerified: true })
        await user.save()
        await Otp.deleteOne({ email });
        return res.status(200).render('otpVerification', { success: "Email verified successfully. Redirecting to login..." })
    } catch (error) {
        return res.status(500).render('otpVerification', { error: 'An error occured' }); 
    }
}) 

//load user login page
const userLogin =  asyncHandler(async (req, res) => {
    
    try {
        res.render('login', { errors: {} });
    } catch (error) {
         console.log(error)
    }
})  

//Login a user
const loginUserCntrl = asyncHandler(async(req,res) =>{
    try {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('login',{
                errors: errors.mapped(), email: req.body.email
        }); 
        }
        const { email,password} = req.body
        //Check User Exists or Not
        const findUser = await User.findOne({email})
        
        if(findUser && findUser.googleId){
            return res.status(401).render('login',{error: "Please SignIn through Google"})
        }else if(findUser && await findUser.isPasswordMatched(password)){
            
            token = generateToken(findUser?._id)
            
            res.cookie('jwt', token, {httpOnly: true})
            return res.status(201).redirect('/dashboard')
            
        }else if(!findUser){ 
            return res.status(401).render('login',{error: "User not registered"})
        }else if(findUser.isBlocked){
            return res.status(401).render('login',{error: "You Are Blocked"})
        }else {
            console.log("************Invalid Credentials")  
            return res.status(401).render('login',{error: "Invalid Credentials"})
        }
    } catch (error) {
        console.error(error);
        return res.status(500).render('login', { error: 'An error occurred during login' });
    }
}) 


//load admin login
const loadLoginAdmin = asyncHandler(async (req,res) =>{
    try {
        return res.render('adminLogin', { errors: {} });
    } catch (error) {
         throw new Error(error)
    }
})


//admin login
const loginAdmin = asyncHandler(async (req,res) =>{
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('adminLogin',{
                errors: errors.mapped(), email: req.body.email
            }); 
        }
        const { email, password} = req.body
        const findAdmin = await User.findOne({ email })
        if(findAdmin && await findAdmin.isPasswordMatched(password)){
            token = generateToken(findAdmin?._id)
                console.log(token)
                res.cookie('jwt', token, {httpOnly: true})
                res.status(201).redirect('/user/admin/dashboard')
        }else {
            console.log("************Invalid Credentials")  
            return res.status(401).render('adminLogin',{error: "Invalid Credentials"})
        }
    } catch (error) {
        console.error(error);
        return res.status(500).render('adminLogin', { error: 'An error occurred during login' });
    }
})


//admin dashboard
const loadAdminDashboard =  asyncHandler(async (req, res) => {
    try {
        const user = JSON.parse(JSON.stringify(req.user))
        return res.render('adminDashboard', {user})
    } catch (error) {
        throw new Error(error)
    }
});

const logout = asyncHandler(async (req, res) =>{
    res.clearCookie('jwt');
    return res.redirect('/user/login');
})


const loadUpdateUser = asyncHandler(async (req,res) =>{
    const { _id } = req.user
    try {
        const user = await User.findById(_id)
        res.render('updateUser', { user })
    } catch (error) {
        console.log(error)
    }
 
})
 
//Update a user
const updateAUser = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    validateMongoDbId(_id)
    try {
        const updatedUser = await User.findByIdAndUpdate(_id, 
            req.body,
            {
                new: true
            }
        )
        res.status(201).redirect('/user/profile')
    } catch (error) {
        console.log(error)
    }
})


const loadPassword = asyncHandler(async (req,res) =>{
    const user = req.user
    try {
        res.render('changePassword', {user})
    } catch (error) {
        console.log(error)
    }
})

const updatePassword = asyncHandler(async (req,res) =>{
    const { currPassword, password: newPassword } = req.body
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('changePassword',{
                errors: errors.mapped(), ...req.body 
        }); 
        }
        const user = req.user 
        const { _id } = user
        console.log(newPassword)
        if(_id && await user.isPasswordMatched(currPassword)){
            if(newPassword){
                const salt = await bcrypt.genSalt(10)
                const hashedPassword = await bcrypt.hash(newPassword, salt);
                const changedPassword = await User.findByIdAndUpdate(_id,
                    { 
                        password: hashedPassword
                    },
                    { 
                        new: true
                    }
                )
                console.log(changedPassword)
                res.redirect('/profile/edit-user')
            }
        }else{
            res.status(401).render('changePassword', { error: "Invalid Current Password"})
        }
    } catch (error) {
        console.log(error)
    }
})

//Get all users
const getAllUsers = asyncHandler(async (req,res) =>{
    try{
        const getUsers = await User.find({ isAdmin: false })
        const user = JSON.parse(JSON.stringify(getUsers))
        res.status(201).render('users', { user })
    }catch(error){
        throw new Error(error)
    }
})



//Get a single user
const getAUser = asyncHandler(async (req,res) =>{
    const { _id } = req.user
    validateMongoDbId(_id)
    try{
        const order = await Order.find({orderby: _id})
        const user = await User.findById(_id).populate('defaultAddress').exec()
        res.status(200).render('profile.hbs', {user,order})
    }catch(error){
        throw new Error(error)
    }
})


//cart
const userCart = asyncHandler(async (req, res) => {
    const { cart } = req.body;
    const { _id } = req.user;

    validateMongoDbId(_id);

    try {
        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let cartToUpdate = await Cart.findOne({ orderby: user._id });

        if (cartToUpdate) {
            // Cart exists for the user, update it
            for (let i = 0; i < cart.length; i++) {
                const { product: productId, count } = cart[i];
                const index = cartToUpdate.products.findIndex(p => p.product.equals(productId));

                if (index !== -1) {
                    // Product already exists in the cart, update count
                    cartToUpdate.products[index].count += count;
                } else {
                    // Product doesn't exist in cart, add it
                    let product = await Product.findById(productId).exec();
 
                    if (product) {
                        const { originalPrice, offerPrice } = await product.getEffectivePrice();
                        const finalPrice = offerPrice !== null ? offerPrice : originalPrice;

                        cartToUpdate.products.push({
                            product: productId,
                            count: count,
                            price: finalPrice
                        });
                        
                    } else {
                        return res.status(404).json({ message: 'Product not found' });
                    }
                }
            }

            // Recalculate cart total
            
            cartToUpdate.cartTotal = 0;
            cartToUpdate.totalAfterDiscount = 0;
            const individualTotals = await Promise.all(cartToUpdate.products.map(async (productItem) => {
                const { product: productId, count } = productItem;
                const product = await Product.findById(productId).exec();
                const { originalPrice, offerPrice } = await product.getEffectivePrice();
                const finalPrice = offerPrice !== null ? offerPrice : originalPrice;

                const total = finalPrice * count;
                cartToUpdate.cartTotal += total;
                cartToUpdate.totalAfterDiscount += total;
                return { productId: product._id, total };
            }));

            await cartToUpdate.save();
            return res.status(200).json({
                cartTotal: cartToUpdate.cartTotal,
                individualTotals
            });
        } else {
            // No cart exists for the user, create a new one
            let products = [];
            let cartTotal = 0;

            for (let i = 0; i < cart.length; i++) {
                const { product: productId, count } = cart[i];
                let product = await Product.findById(productId).exec();

                if (product) {
                    const { originalPrice, offerPrice } = await product.getEffectivePrice();
                    const finalPrice = offerPrice !== null ? offerPrice : originalPrice;

                    products.push({
                        product: productId,
                        count: count,
                        price: finalPrice
                    });
                    cartTotal += finalPrice * count;
                } else {
                    return res.status(404).json({ message: 'Product not found' });
                }
            }

            const newCart = await Cart.create({
                products,
                cartTotal,
                orderby: user._id,
                totalAfterDiscount: cartTotal
            });

            return res.status(201).redirect('/cart');
        }
    } catch (error) {
        console.error(error);
        
    }
});


//load user cart
const loadUserCart = asyncHandler(async (req, res) => {
    const user = req.user;
    const { _id } = user;
    validateMongoDbId(_id);

    try {
        const couponCode = req.session.couponCode;
        const coupon = await Coupon.findOne({ code: couponCode });

        // Fetch cart with populated products
        let cart = await Cart.findOne({ orderby: _id }).populate('products.product').exec();

        if (!cart) {
            throw new Error('Cart not found');
        }

        // Transform products with prices
        const productsWithPrices = await Promise.all(cart.products.map(async productItem => {
            let product = productItem.product;

            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, ''));
            }

            // Compute effective price details
            const { originalPrice, offerPrice, discountPercentage } = await product.getEffectivePrice();
            let finalPrice = offerPrice !== null ? offerPrice : originalPrice;
            let offerSavings = (offerPrice !== null ? (originalPrice - offerPrice) * productItem.count : 0);

            // Update product details
            product.effectivePrice = finalPrice;
            product.originalPrice = originalPrice;
            product.discountPercentage = discountPercentage;
            product.offerSavings = offerSavings.toFixed(2);

            // Return updated product item
            return {
                ...productItem.toObject(),
                product: product 
            };
        }));

        // Update cart's products with transformed products
        cart.products = productsWithPrices;
        res.render('cart', { cart, user, coupon });
    } catch (error) {
        console.error('Error loading user cart:', error);
        // Handle error appropriately, e.g., render an error page
        res.status(500).render('error', { message: 'Error loading cart. Please try again later.' });
    }
});


//decrease quantity of products in cart
const updateCart = asyncHandler(async (req, res) => {
    const { productId, newQuantity } = req.body;
    const { _id } = req.user;

    validateMongoDbId(_id); 

    try {
        const cart = await Cart.findOne({ orderby: _id }).populate('products.product').exec();

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const itemIndex = cart.products.findIndex(p => p.product._id.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        const productItem = cart.products[itemIndex];
        const oldQuantity = productItem.count;
        productItem.count = newQuantity;

        const { originalPrice, offerPrice } = await productItem.product.getEffectivePrice();
        const finalPrice = offerPrice !== null ? offerPrice : originalPrice;

        const offerSavings = offerPrice !== null ? (originalPrice - offerPrice) * newQuantity : 0;

        productItem.product.effectivePrice = finalPrice;
        productItem.product.originalPrice = originalPrice;
        productItem.product.discountPercentage = ((originalPrice - finalPrice) / originalPrice) * 100;
        productItem.product.offerSavings = offerSavings.toFixed(2);

        // Recalculate cart total
        const updatedCartTotal = cart.products.reduce((total, product) => total + product.count * product.price, 0);

        const updatedCart = await Cart.findOneAndUpdate(
            { orderby: _id },
            {
                $set: {
                    products: cart.products,
                    cartTotal: updatedCartTotal,
                    totalAfterDiscount: updatedCartTotal
                }
            },
            { new: true }
        ).populate('products.product').exec();

        const subTotal = updatedCart.products.find(p => p.product._id.toString() === productId)?.count * updatedCart.products.find(p => p.product._id.toString() === productId)?.price || 0;

        res.status(200).json({
            cartTotal: updatedCart.cartTotal,
            count: cart.products[itemIndex].count,
            offerSavings: productItem.product.offerSavings 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//remove item form cart
const removeCartItem = asyncHandler(async (req,res) =>{
    const { productId } = req.body
    const { _id } = req.user
    validateMongoDbId(_id)
    try {
        const cart = await Cart.findOne({ orderby: _id}).populate('products.product').exec()
        if(cart){
            const itemIndex = cart.products.findIndex(p=> p.product._id.toString() === productId);
            if (itemIndex !== -1) {
                cart.products.splice(itemIndex, 1);

                // Recalculate cart total
                cart.cartTotal = cart.products.reduce((acc, item) => acc + item.price * item.count, 0);
                cart.totalAfterDiscount = cart.cartTotal
                await cart.save();
                req.session.couponCode = null
                return res.status(200).json(cart);
            } else {
                return res.status(404).json({ message: 'Product not found in cart' });
            }
        } else {
            return res.status(404).json({ message: 'Cart not found' });
        }  
        
    } catch (error) {
        console.log(error) 
    }
})

//apply coupon
const userApplyCoupon = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    const { couponCode } =  req.body
    req.session.couponCode = couponCode;
    try {
        const cart = await Cart.findOne({ orderby: _id}).populate('products.product').exec()
        const coupon = await Coupon.findOne({ code: couponCode })
        console.log(coupon);
        if(coupon === null){
            return res.status(400).json({ message: 'Invalid coupon code' });
        }
        if (coupon.usedBy.includes(_id)) {
            return res.status(400).json({ message: 'Coupon has already been used' });
          }
        if (coupon.expiry < Date.now()) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }
        if (cart.cartTotal < coupon.minBill) {
            return res.status(400).json({ message: `Minimum bill amount should be Rs.${coupon.minBill}` });
        }
        const discountAmount = coupon.discount
        const totalAfterDiscount = cart.cartTotal - discountAmount
        cart.totalAfterDiscount = totalAfterDiscount
        await cart.save() 
         
        res.json({ success: true, cartTotal: totalAfterDiscount, discount: discountAmount,coupon });

       
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

const userRemoveCoupon = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    try {
        const cart = await Cart.findOne({ orderby: _id });

        if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
        }
        cart.totalAfterDiscount = cart.cartTotal;
        await cart.save();

        // Clear the coupon code from session
        req.session.couponCode = null;

        res.json({ success: true, cartTotal: cart.totalAfterDiscount });
    } catch (error) {
        console.log(error)
    }
})

const userCoupons = asyncHandler(async (req,res) =>{
    const user = req.user
    try {
        const allCoupons = await Coupon.find({}).exec();
        const currentDate = moment();

        const coupons = allCoupons.map(coupon => {
        const isExpired = moment(coupon.expiry).isBefore(currentDate);
        return { ...coupon._doc, isExpired };
        });
        res.render('user-coupons', { coupons, user })
    } catch (error) {
        console.log(error)
    }
})

const createOrder = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    validateMongoDbId(_id);
    const { paymentIntent, couponCode } = req.body;

    try {
        const cart = await Cart.findOne({ orderby: _id }).populate('products.product');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            if (coupon) {
                coupon.usedBy.push(_id);
                await coupon.save();
                req.session.couponCode = null;
            }
        }

        const totalPrice = cart.totalAfterDiscount;

        // Handle different payment intents
        if (paymentIntent === 'razorpay') {
            // Create a Razorpay order
            const options = {
                amount: totalPrice * 100, // amount in paise
                currency: 'INR',
                receipt: `receipt_order_${Date.now()}`
            };
            const razorpayOrder = await razorpay.orders.create(options);
            if (!razorpayOrder) {
                return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
            }
            res.status(201).json({ success: true, razorpayOrder, totalPrice, products: cart.products });
        } else if (paymentIntent === 'cod') {
            // Handle COD orders directly
            await finalizeOrder(cart, _id, paymentIntent, totalPrice, null);
            res.status(201).json({ success: true, message: 'Order placed successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment intent' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

const finalizeOrder = async (cart, userId, paymentIntent, totalPrice, razorpayOrderId) => {
    const order = new Order({
        products: cart.products,
        totalPrice: totalPrice,
        paymentIntent: paymentIntent,
        orderby: userId,
        razorpayOrderId: razorpayOrderId
    });
    await order.save();

    for (const item of cart.products) {
        const product = await Product.findById(item.product._id);
        if (product) {
            product.stock_count -= item.count;
            product.sold += item.count;
            await product.save();
        }
    }

    // Clear the cart after order creation
    cart.products = [];
    cart.cartTotal = 0;
    cart.totalAfterDiscount = 0;
    await cart.save();
};


const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderData } = req.body;

    // Verify the payment signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Payment is verified, create the order
    const order = new Order(orderData);
    await order.save();

    for (const item of orderData.products) {
        const product = await Product.findById(item.product._id);
        if (product) {
            product.stock_count -= item.count;
            product.sold += item.count;
            await product.save();
        }
    }

    // Clear the cart after order creation
    const cart = await Cart.findOne({ orderby: orderData.orderby });
    cart.products = [];
    cart.cartTotal = 0;
    cart.totalAfterDiscount = 0;
    await cart.save();

    res.status(201).json({ success: true, orderId: order._id });
});


const loadCreateOrder = asyncHandler(async (req,res) =>{
    const user = req.user
    try {
        const cart = await Cart.findOne({ orderby: user._id }).populate({
            path: 'products.product', 
             // Specify the fields you want to populate
        }).exec();
        
        cart.products.forEach(productItem => {
            let product = productItem.product;
            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')); // Replace backslashes with forward slashes
            }
        });
        
        const appliedCoupon = req.session.couponCode || ''
        const coupon = await Coupon.findOne({ code: appliedCoupon })

        const address = await Address.find({user: user._id})
        res.render('checkout', { user,cart,address, coupon }) 
    } catch (error) {
        console.log(error);
    }
})

const getOrder = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    validateMongoDbId(_id)
    try {
        const userOrders = await Order.find({ orderby: _id }).populate('products.product').exec()
        userOrders.forEach(order => {
            order.products.forEach(productItem => {
                let product = productItem.product;
                if (product.images && Array.isArray(product.images)) {
                    product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, ''));
                }
            });
        });
        
        res.render('product-orders', { user,orders: userOrders})
    } catch (error) {
        console.log(error)
    }
})

const updateOrderStatus = asyncHandler(async (req,res) =>{
    const { status } = req.body  
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const updateOrderStatus = await Order.findByIdAndUpdate(id,
            { orderStatus : status},
            { new: true }
        )
    } catch (error) {
        console.log(error)
    }
})

const cancelOrder = asyncHandler(async (req,res) =>{
    const { id } = req.params;
    validateMongoDbId( id );
    try {
        // Update the order status to 'Cancelled'
        const order = await Order.findByIdAndUpdate(id,  
            { orderStatus: 'Cancelled' },
            { new: true }
        );
        res.status(200).json({ success: true, message: 'Order cancelled successfully' });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
})

const getAllOrders = asyncHandler( async(req,res) =>{
    const user = req.user
    try {
        const orders = await Order.find().populate('orderby').populate('products.product').exec()
        orders.forEach(order => {
            order.products.forEach(productItem => {
                let product = productItem.product;
                if (product.images && Array.isArray(product.images)) {
                    product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, ''));
                }
            });
        });
        res.render('view-orders', { orders, user})
    } catch (error) {
        console.log(error)
    }
})

//Delete a user
const deleteAUser = asyncHandler(async (req,res) =>{
    const { _id } = req.user
    validateMongoDbId(_id)
    try{
        const deleteUser = await User.findByIdAndDelete(_id)
        res.redirect('/login')
    }catch(error){
        throw new Error(error)
    }
})

//block a user
const blockUser = asyncHandler(async (req,res) =>{
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const blockUser = await User.findByIdAndUpdate(id,{
            isBlocked: true
        },
        {
            new: true
        })
        res.redirect('/user/admin/all-users')
    } catch (error) {
        throw new Error(error)
    }
})

//unblock a user
const unBlockUser = asyncHandler(async (req,res) =>{
    const { id } = req.params
    validateMongoDbId(id)
    try {
        const blockUser = await User.findByIdAndUpdate(id,{
            isBlocked: false
        },
        { 
            new: true
        })
        res.redirect('/user/admin/all-users')
    } catch (error) {
        throw new Error(error)
    }
})


module.exports = {
    loadDashboard,
    userSignup,
    userLogin,
    createUser,
    loginUserCntrl,
    logout,
    getAllUsers,
    getAUser,
    deleteAUser,
    loadUpdateUser,
    updateAUser,
    blockUser,
    unBlockUser,
    resendOtp,
    verifyOtp,
    loginAdmin,
    loadLoginAdmin,
    loadAdminDashboard,
    loadPassword,
    updatePassword,
    loadUserCart,
    userCart,
    updateCart,
    removeCartItem,
    createOrder,
    verifyRazorpayPayment,
    loadCreateOrder,
    getOrder,
    updateOrderStatus,
    cancelOrder,
    getAllOrders,
    userApplyCoupon,
    userCoupons,
    userRemoveCoupon
} 