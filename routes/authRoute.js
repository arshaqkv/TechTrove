const express = require('express')
const noCache = require('nocache')
const { createUser,
        loginUserCntrl, 
        getAllUsers, 
        getAUser, 
        deleteAUser, 
        updateAUser,
        userSignup, 
        userLogin,  
        blockUser, 
        unBlockUser, 
        loadDashboard,
        logout,
        loginAdmin,
        loadLoginAdmin,
        loadAdminDashboard,
        resendOtp,
        verifyOtp,
        loadUpdateUser,
        loadPassword,
        updatePassword,
        loadUserCart,
        userCart,
        updateCart,
        removeCartItem,
        loadCreateOrder,
        createOrder,
        getOrder,
        updateOrderStatus,
        cancelOrder,
        getAllOrders,
        userApplyCoupon,
        userCoupons,
        userRemoveCoupon,
        verifyRazorpayPayment
    } = require('../controllers/userController')
const { validateSignup, validateLogin, validatePassword }  = require('../middlewares/validation')
const { authMiddleware, isAdmin, redirectIfAuthenticated, redirectToAdminDashboard } = require('../middlewares/authMiddleware')
const nocache = require('nocache')
const { verify } = require('crypto')
const router = express.Router()



router.get('/', userSignup)
router.post('/register', validateSignup, createUser)
router.get('/register', nocache(), userSignup)
//otp verification routes
router.post('/resend-otp', resendOtp) 
router.post('/verify-otp', verifyOtp)

router.post('/login', validateLogin, loginUserCntrl)
router.get('/login', redirectIfAuthenticated , nocache(),userLogin)
router.get('/dashboard', authMiddleware, noCache(),loadDashboard)
router.get('/admin', redirectToAdminDashboard ,nocache(), loadLoginAdmin)
router.post('/admin',validateLogin, loginAdmin)
router.get('/admin/dashboard',authMiddleware,isAdmin, noCache(), loadAdminDashboard)
router.get('/logout', logout)
router.get('/admin/all-users', authMiddleware, isAdmin, getAllUsers)
router.get('/profile', authMiddleware, getAUser) 
router.delete('/:id',authMiddleware, deleteAUser)
router.get('/profile/edit-user', authMiddleware, loadUpdateUser)
router.put('/profile/update-user', authMiddleware, updateAUser)
router.get('/profile/change-password', authMiddleware, loadPassword)
router.put('/update-password', validatePassword,authMiddleware, updatePassword)
router.get('/cart', authMiddleware, loadUserCart)
router.post('/cart', authMiddleware, userCart)
router.put('/cart/update', authMiddleware, updateCart)
router.put('/cart/remove', authMiddleware, removeCartItem) 
router.post('/apply-coupon', authMiddleware, userApplyCoupon)
router.post('/remove-coupon', authMiddleware, userRemoveCoupon)
router.get('/coupons', authMiddleware, userCoupons)
router.get('/checkout', authMiddleware, nocache(), loadCreateOrder) 
router.post('/checkout', authMiddleware, noCache(), createOrder) 
router.post('/verify-payment', authMiddleware, verifyRazorpayPayment)
router.get('/get-orders', authMiddleware, getOrder)
router.put('/order/update-order/:id', authMiddleware, updateOrderStatus)
router.put('/order/cancel-order/:id', authMiddleware, cancelOrder)
router.get('/order/all-orders', authMiddleware, isAdmin, getAllOrders)

router.post('/admin/block-user/:id', authMiddleware, isAdmin, blockUser)
router.post('/admin/unblock-user/:id', authMiddleware, isAdmin, unBlockUser)



module.exports = router 


