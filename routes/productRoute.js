const express = require('express')
const { createProduct, 
        getAllProducts, 
        getProduct, 
        updateProduct, 
        deleteProduct, 
        rating,
        loadCreateProduct,
        loadUpdateProduct,
        addToWishList,
        loadWishlist,
        getTrendingItems,
        deleteImage
      } = require('../controllers/productController')
const router = express.Router()
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware')
const { uploadImg, productImgResize } = require('../middlewares/uploadImages')
const incrementPopularity = require('../middlewares/incrementPopularity')
const { validateProduct } = require('../middlewares/validation')

router.get('/wishlist', authMiddleware, loadWishlist)
router.get('/add', authMiddleware, isAdmin, loadCreateProduct)
router.get('/index', authMiddleware, isAdmin, getAllProducts)
router.get('/edit/:id', authMiddleware, isAdmin, loadUpdateProduct)
router.get('/trending-items', authMiddleware, isAdmin, getTrendingItems)
router.get('/:prodId', authMiddleware, incrementPopularity,getProduct) 

router.post('/add', authMiddleware, isAdmin, uploadImg.array('images', 5), validateProduct, productImgResize, createProduct) 
router.put('/update/:id', authMiddleware, isAdmin, uploadImg.array('images', 5), validateProduct, productImgResize, updateProduct)
router.put('/delete-image/:productId', authMiddleware, isAdmin, deleteImage)
router.post('/delete/:id', authMiddleware, isAdmin, deleteProduct)
router.put('/rating/:id', authMiddleware,rating)  
router.put('/wishlist', authMiddleware, addToWishList) 


 
module.exports = router