const express = require('express')
const { validateLogin }  = require('../middlewares/validation')
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware')
const router = express.Router()
const { getPaymentMethodData, getSalesReport } = require('../controllers/adminController');

router.get('/dashboard', authMiddleware. isAdmin, renderAdminDashboar)
router.get('/sales-report', authMiddleware,isAdmin,getSalesReport);

// router.get('/', loadLoginAdmin)
// router.post('/',validateLogin, loginAdmin)
// router.get('/dashboard',authMiddleware,isAdmin,loadAdminDashboard)
// router.get('/all_users', authMiddleware, isAdmin, getAllUsers)
// router.get('/:id', authMiddleware, isAdmin, getAUser)

// // router.post('/block-user', )
// router.put('/block-user/:id', authMiddleware, isAdmin, blockUser)
// router.put('/unblock-user/:id', authMiddleware, isAdmin, unBlockUser)

