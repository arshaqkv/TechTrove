const express = require('express')
const router = express.Router()
const { 
    loadCreateAddress,
    createAddress, 
    loadUpdateAddress,
    updateAddress, 
    deleteAddress, 
    getAddress, 
    getAllAddress,
    defaultAddress
 } = require('../controllers/addressController')
const { validateAddress } = require('../middlewares/validation')
const { authMiddleware } = require('../middlewares/authMiddleware')

router.get('/all', authMiddleware, getAllAddress)
router.get('/add', authMiddleware, loadCreateAddress)
router.get('/edit/:id', authMiddleware, loadUpdateAddress)
router.get('/:id', authMiddleware, getAddress)

router.post('/add', validateAddress,authMiddleware, createAddress)
router.put('/update/:id', validateAddress, authMiddleware, updateAddress) 
router.put('/default/:id', authMiddleware, defaultAddress)  
router.delete('/delete/:id',authMiddleware, deleteAddress)




module.exports = router