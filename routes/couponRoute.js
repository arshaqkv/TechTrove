const express = require('express')
const { getAllCoupons, updateCoupons, deleteCoupons, createCoupon, loadCreateCoupon, loadUpdateCoupons } = require('../controllers/couponControll')
const { isAdmin, authMiddleware } = require('../middlewares/authMiddleware')
const router = express.Router()


router.get('/add', authMiddleware, isAdmin, loadCreateCoupon)
router.post('/add', authMiddleware, isAdmin, createCoupon)
router.get('/', authMiddleware, isAdmin, getAllCoupons)
router.get('/edit/:id', authMiddleware, isAdmin, loadUpdateCoupons)  
router.put('/edit/:id', authMiddleware, isAdmin, updateCoupons)
router.delete('/delete/:id', authMiddleware, isAdmin, deleteCoupons)

module.exports = router  