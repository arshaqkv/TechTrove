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
        verifyRazorpayPayment,
        getExcelReport,
        getPdfReport,
        profileSendOtp,
        profileVerifyOtp,
        loadUpdateStatus,
        returnOrder,
        getOrderInvoice,
        loadWalletTransactions
    } = require('../controllers/userController')
const { validateSignup, validateLogin, validatePassword, validateProfile }  = require('../middlewares/validation')
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
router.get('/admin/dashboard/report/excel', authMiddleware, isAdmin, getExcelReport)
router.get('/admin/dashboard/report/pdf', authMiddleware, isAdmin, getPdfReport)
router.get('/logout', logout)
router.get('/admin/all-users', authMiddleware, isAdmin, getAllUsers)
router.get('/profile', authMiddleware, getAUser) 
router.delete('/:id',authMiddleware, deleteAUser)
router.get('/profile/edit-user', authMiddleware, loadUpdateUser) 
router.put('/profile/update-user', validateProfile, authMiddleware, updateAUser)
router.post('/profile/send-otp', authMiddleware, profileSendOtp)  
router.put('/profile/verify-otp', authMiddleware, profileVerifyOtp)  
router.get('/profile/change-password', authMiddleware, loadPassword)
router.put('/update-password', validatePassword,authMiddleware, updatePassword)
router.get('/cart', authMiddleware, loadUserCart)
router.post('/cart', authMiddleware, userCart)
router.put('/cart/update', authMiddleware, updateCart)
router.put('/cart/remove', authMiddleware, removeCartItem) 
router.post('/apply-coupon', authMiddleware, userApplyCoupon)
router.post('/remove-coupon', authMiddleware, userRemoveCoupon) 
router.get('/coupons', authMiddleware, userCoupons)
router.get('/checkout', authMiddleware, loadCreateOrder) 
router.post('/verify-payment', authMiddleware, verifyRazorpayPayment) 
router.post('/checkout', authMiddleware, createOrder) 
router.get('/get-orders', authMiddleware, getOrder)
router.get('/order/update-order/:id', authMiddleware, isAdmin, loadUpdateStatus)
router.put('/order/update-order/:id', authMiddleware, isAdmin, updateOrderStatus)
router.put('/order/cancel-order/:id', authMiddleware, cancelOrder)
router.put('/order/return-order/:id', authMiddleware, returnOrder)
router.get('/order/all-orders', authMiddleware, isAdmin, getAllOrders)
router.get('/order/download-invoice/:id', authMiddleware , getOrderInvoice)
router.get('/transactions', authMiddleware, loadWalletTransactions)
router.post('/admin/block-user/:id', authMiddleware, isAdmin, blockUser)
router.post('/admin/unblock-user/:id', authMiddleware, isAdmin, unBlockUser)



module.exports = router 


