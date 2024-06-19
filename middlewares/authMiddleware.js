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
            req.user = user 
            next() 
        }
    } catch (error) { 
        //console.log(error);
        console.log("Not authorized, token expired, Please login again")
        return res.status(401).redirect('/user/login');
    }    
    // }else{ 
    //     throw new Error("There is no token attached to header")
    // }
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

module.exports = { authMiddleware, isAdmin }
