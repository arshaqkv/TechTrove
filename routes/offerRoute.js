const express = require('express')
const router = express.Router()
const { authMiddleware, isAdmin} = require('../middlewares/authMiddleware')
const { validateOffer } = require('../middlewares/validation')
const { loadCreateOffer, createOffer, getAllOffers, deleteOffer, loadUpdateOffer, updateOffer } = require('../controllers/OfferController')

router.get('/add', authMiddleware, isAdmin, loadCreateOffer)
router.get('/', authMiddleware, isAdmin, getAllOffers)
router.get('/edit/:id', authMiddleware, isAdmin, loadUpdateOffer)

router.post('/add', authMiddleware, isAdmin, validateOffer, createOffer)
router.put('/update/:id', authMiddleware, isAdmin, validateOffer, updateOffer)
router.delete('/delete/:id', authMiddleware, isAdmin, deleteOffer)


module.exports = router