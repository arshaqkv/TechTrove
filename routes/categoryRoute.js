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
router.post('/add', createCategory)
router.get('/edit/:id', authMiddleware, isAdmin, loadUpdateCategory)
router.put('/update/:id', updateCategory)
router.put('/delete/:id', deleteCategory)
router.get('/:id', getCategory)
router.get('/', authMiddleware, isAdmin, getAllCategory)

module.exports = router