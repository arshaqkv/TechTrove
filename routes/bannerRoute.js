const express = require('express')
const { isAdmin, authMiddleware } = require('../middlewares/authMiddleware')
const { loadCrateBanner, createBanner, banners, deleteBanner } = require('../controllers/bannerController')
const router = express.Router()
const { } = require('../middlewares/validation')

router.get('/add', authMiddleware, isAdmin, loadCrateBanner)
router.post('/add', authMiddleware, isAdmin, createBanner)
router.get('/', authMiddleware, isAdmin, banners)
router.delete('/delete/:id', authMiddleware, isAdmin, deleteBanner)

module.exports = router