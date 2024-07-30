const express = require('express')
const router = express.Router()
const { 
        createCategory, 
        updateCategory, 
        deleteCategory, 
        getCategory, 
        getAllCategory, 
        loadCreateCategory,
        loadUpdateCategory
} = require('../controllers/categoryController')
const { authMiddleware, isAdmin} = require('../middlewares/authMiddleware')

router.get('/add', authMiddleware, isAdmin, loadCreateCategory)
router.get('/edit/:id', authMiddleware, isAdmin, loadUpdateCategory)
router.get('/:id', authMiddleware, isAdmin, getCategory)
router.get('/', authMiddleware, isAdmin, getAllCategory)

router.post('/add', authMiddleware, isAdmin, createCategory)
router.put('/update/:id', authMiddleware, isAdmin, updateCategory)
router.put('/delete/:id', authMiddleware, isAdmin, deleteCategory)


module.exports = router