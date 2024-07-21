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
    const { title } = req.body
    try {
        const existingCategory = await Category.findOne({ title })
        if(existingCategory){
            res.status(400).json({ success: false, message: 'Category Already exists'})
        }
        const newCategory = await Category.create(req.body)
        res.status(201).json({ success: true, message: 'Category created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred while creating the category' });
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

const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const { title } = req.body;

        // Check if category with the same title already exists
        const existingCategory = await Category.findOne({ title });   
        if (existingCategory && existingCategory._id.toString() !== id) {
            return res.status(400).json({ success: false, message: 'Category name already exists.' });
        }

        const updatedCategory = await Category.findByIdAndUpdate(id, req.body, {
            new: true
        });

        res.status(200).json({ success: true, message: 'Category updated successfully.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the category.' });
    }
});

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
    const page = parseInt(req.query.page) || 1;
    const limit = 3 
    try {

        const count = await Category.countDocuments({isDeleted: false});
        const totalPages = Math.ceil(count / limit);
        const skip = (page - 1) * limit;
        const findAllCategory = await Category.find({ isDeleted: false })
            .skip(skip) 
            .limit(limit);

        const pagination = {
            totalPages,
            page,
            limit,
            count,
            pages: Array.from({ length: totalPages }, (_, i) => ({ page: i + 1, active: i + 1 === page })),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
        res.status(200).render('allCategories', { categories: findAllCategory, pagination,count })
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