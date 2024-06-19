const express = require('express')
const { createProduct, 
        getAllProducts, 
        getProduct, 
        updateProduct, 
        deleteProduct, 
        rating,
        loadCreateProduct,
        loadUpdateProduct
      } = require('../controllers/productController')
const router = express.Router()
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware')
const { uploadImg, productImgResize } = require('../middlewares/uploadImages')

router.get('/add', authMiddleware, isAdmin, loadCreateProduct)
router.post('/add', uploadImg.array('images', 5), createProduct) 
// router.put('/upload/:id', uploadImg.array('images', 10), productImgResize, uploadImages)
router.get('/index', authMiddleware, isAdmin, getAllProducts)
router.get('/edit/:id', authMiddleware, isAdmin, loadUpdateProduct)
router.put('/update/:id', uploadImg.array('images', 5),  updateProduct)
router.post('/delete/:id', authMiddleware, isAdmin, deleteProduct)
router.put('/rating/:id', authMiddleware,rating)  
router.get('/:id', authMiddleware, getProduct) 
 
module.exports = router