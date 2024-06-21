const User = require('../models/userModel')
const asyncHandler = require('express-async-handler')
const { generateToken } = require('../config/jwToken')
const { validationResult } = require('express-validator')
const validateMongoDbId = require('../utils/validateMongodbID')
const bcrypt = require('bcrypt')
const Otp = require('../models/otpModel')
const mailer = require('../helpers/nodemailer')
const { oneMinuteExpiry, fiveMinuteExpiry } = require('../helpers/otpValidate')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Cart = require('../models/cartModel')

//home page
const loadDashboard = asyncHandler(async (req, res) => {
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

    try {
        const [products, categories] = await Promise.all([
            Product.find(filter).populate('category').sort(sort).exec(),
            Category.find({ isDeleted: false }).exec()
        ]);

        products.forEach(product => {
            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')); // Replace backslashes with forward slashes
            }
        });

        
            const user = JSON.parse(JSON.stringify(req.user));
           
            return res.render('userDashboard', { user, products, categories });
        
    } catch (error) {
        throw new Error(error);
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
            console.log(token)
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
    const { id } = req.query
    try {
        const user = await User.findById(id)
        res.render('updateUser', { user })
    } catch (error) {
        console.log(error)
    }

})
 
//Update a user
const updateAUser = asyncHandler(async (req,res) =>{
    console.log(req.user)
    const { _id } = req.user
    validateMongoDbId(_id)
    console.log(id)
    try {
        const updatedUser = await User.findByIdAndUpdate({id:_id}, 
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
        const user = await User.findById(_id).populate('defaultAddress').exec()
        console.log(user)
        res.status(200).render('profile.hbs', {user})
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
                    let getPrice = await Product.findById(productId).select('price').exec();

                    if (getPrice) {
                        cartToUpdate.products.push({
                            product: productId,
                            count: count,
                            price: getPrice.price
                        });
                    } else {
                        return res.status(404).json({ message: 'Product not found' });
                    }
                }
            }

            // Recalculate cart total
            cartToUpdate.cartTotal = 0;
            for (let i = 0; i < cartToUpdate.products.length; i++) {
                cartToUpdate.cartTotal += cartToUpdate.products[i].price * cartToUpdate.products[i].count;
            }

            await cartToUpdate.save();
            return res.status(200).redirect('/cart')
        } else {
            // No cart exists for the user, create a new one
            let products = [];
            let cartTotal = 0;

            for (let i = 0; i < cart.length; i++) {
                const { product: productId, count } = cart[i];
                let getPrice = await Product.findById(productId).select('price').exec();

                if (getPrice) {
                    products.push({
                        product: productId,
                        count: count,
                        price: getPrice.price
                    });
                    cartTotal += getPrice.price * count;
                } else {
                    return res.status(404).json({ message: 'Product not found' });
                }
            }

            const newCart = await Cart.create({
                products,
                cartTotal,
                orderby: user._id
            });

            return res.status(201).redirect('/cart');
        }
    } catch (error) {
        console.error(error);
        
    }
});


//load user cart
const loadUserCart = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    validateMongoDbId(_id)
    try {
        const cart = await Cart.findOne({ orderby: _id }).populate({
            path: 'products.product',
             // Specify the fields you want to populate
        }).exec();
        
        cart.products.forEach(productItem => {
            let product = productItem.product;
            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, '')); // Replace backslashes with forward slashes
            }
        });
        res.render('cart', { cart, user })
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
    userCart
} 