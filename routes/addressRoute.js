const express = require('express')
const router = express.Router()
const { 
    loadCreateAddress,
    createAddress, 
    loadUpdateAddress,
    updateAddress, 
    deleteAddress, 
    getAddress, 
    getAllAddress
 } = require('../controllers/addressController')
const { authMiddleware } = require('../middlewares/authMiddleware')

router.get('/add', authMiddleware, loadCreateAddress)
router.post('/add', createAddress)
router.get('/edit/:id', authMiddleware, loadUpdateAddress)
router.put('/update/:id', updateAddress) 
router.put('/delete/:id', deleteAddress)
router.get('/:id', authMiddleware, getAddress)
router.get('/all', authMiddleware, getAllAddress)

module.exports = router