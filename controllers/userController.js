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
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs')
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
    const user = req.user
    const { startDate, endDate, salesDuration } = req.query;
    try {

        const totalOrders = await Order.countDocuments();
        const totalDelivered = await Order.countDocuments({ orderStatus: 'Delivered' });
        const totalCanceled = await Order.countDocuments({ orderStatus: 'Cancelled' });
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' } 
                } 
            }
        ]);

        const paymentData = await Order.aggregate([  
            {
                $group: {
                    _id: '$paymentIntent',
                    count: { $sum: 1}
                }
            }
        ])

        const orderStatusData = await Order.aggregate([
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1}
                }
            }
        ])
      
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); 
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        const oneDaySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {$gte: startOfDay}
                },
            },
            { 
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalPrice' }
                }
            }
        ])

        const oneWeekSales = await Order.aggregate([
            {
                $match: {
                    createdAt: {$gte: startOfWeek}
                },
            },
            { 
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalPrice' }
                }
            }
        ])

        const oneMonthSales = await Order.aggregate([
            {
                $match: {
                    createdAt: {$gte: startOfMonth}
                },
            },
            { 
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalPrice' }
                }
            }
        ])

        let customDateSales = [];
        let customDateOrders = [];

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            customDateSales = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$totalPrice' }
                    }
                }
            ]);
            customDateOrders = await Order.find({
                createdAt: { $gte: start, $lte: end }
            }).populate('products.product');
        } else {
            let matchCondition;
            switch (salesDuration) {
                case 'daily':
                    matchCondition = { createdAt: { $gte: startOfDay } };
                    break;
                case 'weekly':
                    matchCondition = { createdAt: { $gte: startOfWeek } };
                    break;
                case 'monthly':
                    matchCondition = { createdAt: { $gte: startOfMonth } };
                    break;
                case 'yearly':
                    matchCondition = { createdAt: { $gte: startOfYear } };
                    break;
                default:
                    matchCondition = {};
            }

            customDateSales = await Order.aggregate([
                { 
                    $match: matchCondition
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$totalPrice' }
                    }
                }
            ]);
            customDateOrders = await Order.find(matchCondition).populate('products.product');
        }

        totalSales = customDateSales[0] ? customDateSales[0].totalSales : 0;
        let customDiscount = 0;
        const customDateOrderDetails = customDateOrders.map(order => {
            let orderDiscount = 0;
            const products = order.products.map(product => {
                const productPrice = product.product.price*(product.count)
                const discount = productPrice - order.totalPrice;
                orderDiscount += discount 
                return {
                    name: product.product.title,
                    price: product.product.price,
                    count: product.count,
                    discount,
                };
            });
            
            const totalDiscount = products.reduce((acc, product) => acc + product.discount * product.count, 0);
            customDiscount += totalDiscount
            console.log(customDiscount)
            return {
                orderId: `#${order.orderId}`,
                totalPrice: order.totalPrice,
                orderStatus: order.orderStatus,
                paymentIntent: order.paymentIntent,
                products,
                discount: orderDiscount
            };

        });
        
        const totalDiscount = await Order.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $group: {
                    _id: '$_id',
                    totalOriginalPrice: { $sum: '$productDetails.price' },
                    totalFinalPrice: { $first: '$totalPrice' }
                }
            },
            {
                $project: {
                    discount: { $subtract: ['$totalOriginalPrice', '$totalFinalPrice'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDiscount: { $sum: '$discount' }
                }
            }
        ]);

        const currentYear = new Date().getFullYear();
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(currentYear, 0, 1),
                        $lte: new Date(currentYear, 11, 31)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalSales: { $sum: "$totalPrice" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        const monthlySalesData = Array(12).fill(0);
        monthlySales.forEach(month => {
            monthlySalesData[month._id - 1] = month.totalSales;
        });

        // Get yearly sales data for the past 5 years
        const startYear = currentYear - 4;
        const yearlySales = await Order.aggregate([
            {  
                $match: {
                    createdAt: {
                        $gte: new Date(startYear, 0, 1),
                        $lte: new Date(currentYear, 11, 31)
                    }
                }
            },
            {
                $group: {
                    _id: { $year: "$createdAt" },
                    totalSales: { $sum: "$totalPrice" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        const yearlySalesData = yearlySales.map(year => ({
            year: year._id,
            totalSales: year.totalSales
        }));
        const currentDate = new Date();
        const currentDay = currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
         
        res.render('adminDashboard', {
            user, // Assuming you have user information in the request
            totalOrders, 
            totalDelivered,
            totalCanceled, 
            totalRevenue: totalRevenue[0] ? totalRevenue[0].totalRevenue : 0,
            paymentData: JSON.stringify(paymentData),
            orderStatusData: JSON.stringify(orderStatusData), 
            oneDaySales: oneDaySales[0] ? oneDaySales[0].totalSales : 0,
            oneWeekSales: oneWeekSales[0] ? oneWeekSales[0].totalSales : 0,
            oneMonthSales: oneMonthSales[0] ? oneMonthSales[0].totalSales : 0,
            totalDiscount: totalDiscount[0] ? totalDiscount[0].totalDiscount : 0,
            currentDay, 
            currentMonth,
            customDateOrders: customDateOrderDetails,
            startDate,   
            endDate,
            salesDuration,
            monthlySalesData: JSON.stringify(monthlySalesData),
            yearlySalesData: JSON.stringify(yearlySalesData),
            customDateSales: totalSales,
            customDiscount
        }) 
    } catch (error) {
        console.log(error)
    }
});


const getExcelReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, salesDuration } = req.query;
    try {
        let start, end
        if(startDate, endDate){
            start = new Date(startDate)
            end = new Date(endDate)
        }else {
            const today = new Date()
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfYear = new Date(today.getFullYear(), 0, 1);

            switch (salesDuration) {
                case 'daily':
                    start = startOfDay;
                    end = new Date();
                    break;
                case 'weekly':
                    start = startOfWeek;
                    end = new Date();
                    break;
                case 'monthly':
                    start = startOfMonth;
                    end = new Date();
                    break;
                case 'yearly':
                    start = startOfYear;
                    end = new Date();
                    break;
                default:
                    start = new Date(0);
                    end = new Date();
            }
        }
        const orders = await Order.find({ createdAt: { $gte: start, $lte: end } }).populate('products.product');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('TechTrove Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 25 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
            { header: 'Order Status', key: 'orderStatus', width: 20 },
            { header: 'Payment Method', key: 'paymentIntent', width: 25 },
            { header: 'Products', key: 'products', width: 50 },
            { header: 'Discount', key: 'discount', width: 20 }
        ];

        // Bold the headers
        worksheet.getRow(1).font = { bold: true };

        let totalSum = 0;
        let discountSum = 0;

        orders.forEach(order => {
            const totalProductsPrice = order.products.reduce((acc, p) => acc + (p.count * p.product.price), 0);
            const discount = totalProductsPrice - order.totalPrice;
            
            totalSum += order.totalPrice
            discountSum += discount

            worksheet.addRow({
                orderId: `#${order.orderId}`,
                totalPrice: `₹${order.totalPrice}`,
                orderStatus: order.orderStatus,
                paymentIntent: order.paymentIntent,
                products: order.products.map(p => `${p.product.title}: ${p.count} x ₹${p.product.price}`).join(', '),
                discount: `₹${discount}`
            });
        });

        worksheet.addRow({
            orderId: 'Totals',
            totalPrice: `₹${totalSum}`,
            discount: `₹${discountSum}`
        });

        const totalsRow = worksheet.getRow(worksheet.lastRow.number);
        totalsRow.font = { bold: true };

        res.setHeader('Content-Disposition', `attachment; filename=${start.toDateString()}-${end.toDateString()}-report.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.log(error);
    }
});



const getPdfReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, salesDuration } = req.query;
    try {
        let start, end
        if(startDate, endDate){
            start = new Date(startDate)
            end = new Date(endDate)
        }else {
            const today = new Date()
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfYear = new Date(today.getFullYear(), 0, 1);

            switch (salesDuration) {
                case 'daily':
                    start = startOfDay;
                    end = new Date();
                    break;
                case 'weekly':
                    start = startOfWeek;
                    end = new Date();
                    break;
                case 'monthly':
                    start = startOfMonth;
                    end = new Date();
                    break;
                case 'yearly':
                    start = startOfYear;
                    end = new Date();
                    break;
                default:
                    start = new Date(0);
                    end = new Date();
            }
        }

        const orders = await Order.find({ createdAt: { $gte: start, $lte: end } }).populate('products.product');

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No orders found for the specified date range' });
        }

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Length', Buffer.byteLength(pdfData));
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-disposition', `attachment; filename=${start.toDateString()}-${end.toDateString()}-report.pdf`);
            res.send(pdfData);
        });

        const tableTop = 130; // Y coordinate for top of the table
        const tableMargin = 25; // Margin for table content

        doc.fontSize(20).text('TechTrove Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Range: ${start.toDateString()} - ${end.toDateString()}`, { align: 'center'});
        doc.moveDown();


        // Table headers
        const headers = ['Order ID', 'Total Price', 'Order Status', 'Payment Method', 'Products', 'Discount'];
        const columnWidths = [80, 80, 90, 100, 150, 80];
        const tableY = tableTop + tableMargin;

        // Draw headers
        doc.font('Helvetica-Bold').fontSize(11);
        headers.forEach((header, index) => {
            doc.text(header, tableMargin + sumArray(columnWidths.slice(0, index)), tableY, { width: columnWidths[index], align: 'center' });
        });
        
        const headerBottomY = tableY + 15; // Adjust height of header
        doc.moveTo(tableMargin, headerBottomY)
           .lineTo(tableMargin + sumArray(columnWidths), headerBottomY)
           .stroke();

        // Draw rows
        let currentY = headerBottomY + tableMargin / 2;
        doc.font('Helvetica').fontSize(10);
        orders.forEach(order => {
            const totalProductsPrice = order.products.reduce((acc, p) => acc + (p.count * p.product.price), 0);
            const discount = totalProductsPrice - order.totalPrice;

            const rowData = [
                `#${order.orderId}`,
                `₹${order.totalPrice}`,
                order.orderStatus,
                order.paymentIntent,
                order.products.map(p => `${p.product.title}: ${p.count} x ₹${p.product.price}`).join('\n'),
                `₹${discount}`
            ];

            rowData.forEach((data, index) => {
                doc.text(data, tableMargin + sumArray(columnWidths.slice(0, index)), currentY, { width: columnWidths[index], align: 'center' });
            });

            currentY += 20 + Math.max(...rowData.map(row => row.split('\n').length - 1)) * 10;
        });

        doc.end();

    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ message: 'Failed to generate PDF report' });
    }
});

// Helper function to sum an array
function sumArray(arr) {
    return arr.reduce((acc, val) => acc + val, 0);
}

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

const profileSendOtp = asyncHandler(async (req,res) =>{
    const { email,name } = req.body
    console.log(email,name)
    try{

        const g_otp = await Math.floor(100000 + Math.random() * 900000)
        const currDate = new Date()
        const otpEntry = await Otp.findOneAndUpdate(
            { email: email },
            { otp: g_otp, timestamp: new Date(currDate.getTime())},
            { upsert: true, new: true, setDefaultsOnInsert: true} 
        )
        
        const message = '<h2>Hi '+ name +' , Welcome to TechTrove </h2>,<p>Please confirm your OTP</p> <br> Here is your OTP code: <h4></p>'+ g_otp +' </h4>'
        mailer.sendVerificationMail( email, 'Otp Verification code', message) 
        res.json({ success: true, email });
    }catch(error){
        console.log(error)
    }
})

const profileVerifyOtp = asyncHandler(async (req,res) =>{
    const { otp, email } = req.body;
    const { id } = req.user
    console.log(otp,email)
    try {
        const otpData = await Otp.findOne({ email, otp })
        if(!otpData){
            return res.status(400).json ({ success: false, message: "You entered wrong otp"})
        }

        const user = await User.findByIdAndUpdate(id,
            { 
                email: email 
            },
            { 
                new: true
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.log(error)
    }
})
 
//Update a user
const updateAUser = asyncHandler(async (req,res) =>{
    const user = req.user
    const { _id } = user
    const { name, phone } = req.body
    validateMongoDbId(_id)
    try {
        const updatedUser = await User.findByIdAndUpdate(_id, 
            {
                name: name,
                phone: phone
            },
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
        const coupons = await Coupon.find({});

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
        res.render('cart', { cart, user, coupons }); 
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

function generateOrderId() {
    const timestamp = Date.now().toString().slice(-4);
    const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
    const hash = crypto.createHash('sha256').update(timestamp + randomNum).digest('hex').slice(0, 2); // First 2 characters of the hash
    return `${timestamp}${randomNum}${hash}`;
}

const createOrder = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    validateMongoDbId(_id);
    const { paymentIntent } = req.body;
    couponCode = req.session.couponCode
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
        const orderId = generateOrderId();

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
            await finalizeOrder(cart, _id, paymentIntent, totalPrice, orderId, null);
            res.status(201).json({ success: true, message: 'Order placed successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment intent' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

const finalizeOrder = async (cart, userId, paymentIntent, totalPrice,orderId, razorpayOrderId) => {
    const order = new Order({
        orderId: orderId,
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

    const orderId = generateOrderId()
    // Payment is verified, create the order
    const order = new Order({
        ...orderData,
        orderId: orderId
    });
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

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    try {
        const count = await Order.countDocuments({ orderby: _id });
        const totalPages = Math.ceil(count / limit);
        const skip = (page - 1) * limit;
        
        const userOrders = await Order.find({ orderby: _id })
            .populate('products.product')
            .sort({ createdAt: -1 }) // Sort by most recent first
            .skip(skip)
            .limit(limit) 
            .exec();
 
        userOrders.forEach(order => {
            order.products.forEach(productItem => {
                let product = productItem.product;
                if (product.images && Array.isArray(product.images)) {
                    product.images = product.images.map(img => img.replace(/\\/g, '/').replace(/public/g, ''));
                }
            });
        });
        

        const pagination = {
            totalPages,
            page,
            count,
            pages: Array.from({ length: totalPages }, (_, i) => ({ page: i + 1, active: i + 1 === page })),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
        console.log(pagination)
        res.render('product-orders', { user,orders: userOrders, pagination})
    } catch (error) {
        console.log(error)
    }
})

const loadUpdateStatus = asyncHandler(async (req,res) =>{
    const user = req.user
    const { id } = req.params
    try{
        const order = await Order.findById(id)
        .populate('products.product')
        .populate({
            path: 'orderby',
            populate: {
              path: 'defaultAddress',
              model: 'Address' // Ensure 'Address' is the correct model name
            }
        });

        order.products.forEach(productItem => {
            let product = productItem.product;
            if (product.images && Array.isArray(product.images)) {
                product.images = product.images.map(img => img.replace(/public/g, ''));
            }
        });
        res.render('orderStatus', { order,user })
    }catch(error){
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
        console.log(status,updateOrderStatus)
        if (!updateOrderStatus) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Respond with success message
        res.json({ success: true, message: 'Order status updated successfully', updateOrderStatus });
    } catch (error) { 
        console.log(error)
    }
})

const cancelOrder = asyncHandler(async (req,res) =>{
    const { id } = req.params;
    validateMongoDbId( id );
    try {
        // Update the order status to 'Cancelled'
        const order = await Order.findById(id).populate('products.product')
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.orderStatus = 'Cancelled'
        await order.save()

        for(const item of order.products){
            const product = await Product.findById(item.product._id)
            console.log(product)
            if(product){
                product.stock_count += item.count
                product.sold -= item.count
                await product.save()
            }
        }

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
    profileSendOtp,
    profileVerifyOtp,
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
    loadUpdateStatus,
    updateOrderStatus,
    cancelOrder,
    getAllOrders,
    userApplyCoupon,
    userCoupons,
    userRemoveCoupon,
    getExcelReport,
    getPdfReport
} 