const express = require('express')
const { createCoupen, getAllCoupens, updateCoupens, deleteCoupens } = require('../controllers/coupenControll')
const { isAdmin, authMiddleware } = require('../middlewares/authMiddleware')
const router = express.Router()

router.post('/', authMiddleware, isAdmin,createCoupen)
router.get('/', authMiddleware, isAdmin, getAllCoupens)
router.put('/:id', authMiddleware, isAdmin, updateCoupens)
router.delete('/:id', authMiddleware, isAdmin, deleteCoupens)

module.exports = router