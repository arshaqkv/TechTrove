const Address = require('../models/addressModel')
const asyncHandler = require('express-async-handler')
const User = require('../models/userModel')

const loadCreateAddress = asyncHandler(async (req,res) =>{
    const user = req.user
    try {
        res.status(201).render('addAddress', { user })
    } catch (error) {
        throw new Error(error)
    }
})

const createAddress = asyncHandler(async (req,res) =>{
    try {
        const newAddress = await Address.create(req.body)
        res.status(201).redirect('/address/all')
    } catch (error) {
        throw new Error(error)
    } 
})

const loadUpdateAddress= asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const address = await Address.findById(id)
        res.status(200).render('editAddress', { address })
    } catch (error) {
        throw new Error(error)
    }
})

const updateAddress = asyncHandler(async (req,res) =>{
    const {id} = req.params
    try {
        const updatedAddress = await Address.findByIdAndUpdate(id, req.body, {
            new: true
        })
        res.status(201).redirect('/address/all')
    } catch (error) {
        throw new Error(error)
    } 
})

const deleteAddress = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const deletedAddress = await Address.findOneAndDelete(id)
        res.status(201).redirect('/address/all')
    } catch (error) {
        throw new Error(error)
    } 
})

const getAddress = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const findAddress = await Address.findById(id)
        res.json(findCategory)  
    } catch (error) {
        throw new Error(error)
    } 
})

const getAllAddress = asyncHandler(async (req,res) =>{
    const user = req.user
    const { id } = user
    try {
        const findAllAddress = await Address.find({ user: id })
        res.status(201).render('all-address', { address: findAllAddress, user })
    } catch (error) {
        throw new Error(error)
    } 
})

const defaultAddress = asyncHandler(async (req,res) =>{
    const { id } = req.params
    const { userId } = req.body
    try {
        await Address.updateMany({ user: userId }, { default: false });

        // Set the selected address to default
        await Address.findByIdAndUpdate(id, { default: true });

        // Optionally, update the user schema with the default address reference
        await User.findByIdAndUpdate(userId, { defaultAddress: id });
        // res.redirect('/user/profile') 
    } catch (error) {
        console.log(error)
    }
})

module.exports = {  loadCreateAddress,
                    createAddress, 
                    loadUpdateAddress,
                    updateAddress, 
                    deleteAddress, 
                    getAddress, 
                    getAllAddress,
                    defaultAddress
                }