const User = require('../models/userModel')
const asyncHandler = require('express-async-handler')




//Get all users
const getAllUsers = asyncHandler(async (req,res) =>{
    try{
        const getUsers = await User.find()
        res.status(201).render('users', {user: getUsers})
    }catch(error){
        throw new Error(error)
    }
})