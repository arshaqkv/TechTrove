const Category = require('../models/categoryModel')
const asyncHandler = require('express-async-handler')

const loadCreateCategory = asyncHandler(async (req,res) =>{
    try {
        res.status(201).render('addCategory')
    } catch (error) {
        throw new Error(error)
    }
})

const createCategory = asyncHandler(async (req,res) =>{
    try {
        const newCategory = await Category.create(req.body)
        res.status(201).redirect('/prod/category')
    } catch (error) {
        throw new Error(error)
    } 
})

const loadUpdateCategory = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const category = await Category.findById(id)
        res.status(200).render('editCategory', { category })
    } catch (error) {
        throw new Error(error)
    }
})

const updateCategory = asyncHandler(async (req,res) =>{
    const {id} = req.params
    try {
        const updatedCategory = await Category.findByIdAndUpdate(id, req.body, {
            new: true
        })
        res.status(201).redirect('/prod/category')
    } catch (error) {
        throw new Error(error)
    } 
})

const deleteCategory = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const deletedCategory = await Category.findByIdAndUpdate(id, 
            { isDeleted: true },
            { new: true}
        )
        res.status(201).redirect('/prod/category')
    } catch (error) {
        throw new Error(error)
    } 
})

const getCategory = asyncHandler(async (req,res) =>{
    const { id } = req.params
    try {
        const findCategory = await Category.findById(id)
        res.json(findCategory)
    } catch (error) {
        throw new Error(error)
    } 
})

const getAllCategory = asyncHandler(async (req,res) =>{
    try {
        const findAllCategory = await Category.find({ isDeleted: false })
        res.status(200).render('allCategories', { categories: findAllCategory })
    } catch (error) {
        throw new Error(error)
    } 
})

module.exports = {  loadCreateCategory,
                    createCategory, 
                    loadUpdateCategory,
                    updateCategory, 
                    deleteCategory, 
                    getCategory, 
                    getAllCategory}