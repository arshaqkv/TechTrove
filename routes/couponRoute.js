const express = require('express')
const { getAllCoupons, updateCoupons, deleteCoupons, createCoupon, loadCreateCoupon, loadUpdateCoupons } = require('../controllers/couponControll')
const { isAdmin, authMiddleware } = require('../middlewares/authMiddleware')
const router = express.Router()
const { validateCoupon } = require('../middlewares/validation')


router.get('/add' ,authMiddleware, isAdmin, loadCreateCoupon)
router.get('/edit/:id'  ,authMiddleware, isAdmin, loadUpdateCoupons) 
router.get('/', authMiddleware, isAdmin, getAllCoupons)

router.post('/add', validateCoupon, authMiddleware, isAdmin, createCoupon)
router.put('/edit/:id', validateCoupon,authMiddleware, isAdmin, updateCoupons)
router.delete('/delete/:id', authMiddleware, isAdmin, deleteCoupons)
 
module.exports = router  