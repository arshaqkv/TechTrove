const express = require('express')
const router = express.Router()
const { authMiddleware, isAdmin} = require('../middlewares/authMiddleware')

const { loadCreateOffer, createOffer, getAllOffers, deleteOffer, loadUpdateOffer } = require('../controllers/OfferController')

router.get('/add', authMiddleware, isAdmin, loadCreateOffer)
router.post('/add', authMiddleware, isAdmin, createOffer)
router.get('/', authMiddleware, isAdmin, getAllOffers)
router.delete('/delete/:id', authMiddleware, isAdmin, deleteOffer)
router.get('/edit/:id', authMiddleware, isAdmin, loadUpdateOffer)

module.exports = router