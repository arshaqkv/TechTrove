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
router.put('/default/:id', authMiddleware, defaultAddress)
router.get('/add', authMiddleware, loadCreateAddress)
router.post('/add', validateAddress,authMiddleware, createAddress)
router.get('/edit/:id', authMiddleware, loadUpdateAddress)
router.put('/update/:id', validateAddress, authMiddleware, updateAddress)  
router.delete('/delete/:id',authMiddleware, deleteAddress)
router.get('/:id', authMiddleware, getAddress)



module.exports = router