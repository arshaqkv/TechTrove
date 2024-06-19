const Address = require('../models/addressModel')
const asyncHandler = require('express-async-handler')

const loadCreateAddress = asyncHandler(async (req,res) =>{
    try {
        res.status(201).render('addAddress')
    } catch (error) {
        throw new Error(error)
    }
})

const createAddress = asyncHandler(async (req,res) =>{
    try {
        const newAddress = await Address.create(req.body)
        res.status(201).redirect('/user/profile')
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
        res.status(201).redirect('/user/profile')
    } catch (error) {
        throw new Error(error)
    } 
})

const deleteAddress = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const deletedAddress = await Address.findbyIdAndDelete(id)  
        res.status(201).redirect('/user/profile')
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
    try {
        const findAllAddress = await Address.find()
        console.log(findAllAddress)
        res.status(201).render('all-address', { address: findAllAddress })
    } catch (error) {
        throw new Error(error)
    } 
})

module.exports = {  loadCreateAddress,
                    createAddress, 
                    loadUpdateAddress,
                    updateAddress, 
                    deleteAddress, 
                    getAddress, 
                    getAllAddress
                }