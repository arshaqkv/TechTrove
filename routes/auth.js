const express = require('express');
const passport = require('passport');
const { generateToken } = require('../config/jwToken')
const router = express.Router();

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'] 
}));
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/user/login'}), 
       async (req, res) => {
            const user = req.user
            // console.log(user)
            const token = generateToken(user._id)
            res.cookie('jwt', token, {httpOnly: true})
            res.status(201).redirect('/home')
});



module.exports = router;
