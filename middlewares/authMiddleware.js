const User = require('../models/userModel')
const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')

    const authMiddleware = asyncHandler(async (req,res,next) =>{
        const token = req.cookies.jwt
        if (!token) {
            return res.status(401).redirect('/user/login'); // Redirect to login if not authenticated
        }
            
        try {
            if(token){
                const decoded = jwt.verify(token,process.env.JWT_SECRET)
                const user = await User.findById(decoded?.id)
                if (!user) {
                    return res.status(401).redirect('/user/login'); // Redirect to login if user not found
                }

                if (user.isBlocked) {
                    // Clear the JWT cookie
                    res.cookie('jwt', '', { expires: new Date(0), httpOnly: true });
                    return res.status(403).redirect('/user/login'); // Forbidden status, redirect to login
                }           

                req.user = user 
                next() 
            }
        } catch (error) { 
            //console.log(error);
            console.log("Not authorized, token expired, Please login again")
            return res.status(401).redirect('/user/login');
        }    
    })


const isAdmin = asyncHandler(async (req,res,next) =>{
    const { email } = req.user
    const adminUser = await User.findOne({ email })
    if(!adminUser.isAdmin){
        return res.status(401).render('adminlogin',{error: "You are not an Admin"})
    }else{
        next()
    }
})

const redirectIfAuthenticated = asyncHandler(async (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded?.id);
            if (user) {
                return res.redirect('/home'); // Redirect to dashboard if authenticated
            }
        } catch (error) {
            // Token might be expired or invalid, so clear the cookie
            res.clearCookie('jwt');
        }
    }
    next();
});

const redirectToAdminDashboard = asyncHandler(async (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded?.id);
            if (user) {
                return res.redirect('/admin/dashboard'); // Redirect to dashboard if authenticated
            }
        } catch (error) {
            // Token might be expired or invalid, so clear the cookie
            res.clearCookie('jwt');
        }
    }
    next();
});

module.exports = { authMiddleware, isAdmin, redirectIfAuthenticated, redirectToAdminDashboard}
