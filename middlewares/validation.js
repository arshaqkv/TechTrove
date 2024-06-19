const { body, validationResult } = require('express-validator')
const User = require('../models/userModel')
const Otp = require('../models/otpModel')

// Custom validator for password strength
const isStrongPassword = (value) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%#*?&]{8,}$/;
    if (!passwordRegex.test(value)) {
      throw new Error('Must Contain 8 Characters, One Uppercase, One Lowercase, One Number and One Special Character');
    }
    return true;
};

//Custom validator for confirm password
const isSamePassword = (value, { req }) => {
    if (value !== req.body.password) {
    throw new Error('Passwords do not match');
    }
    return true;
}

// Custom validator for 10-digit phone number
const isValidPhoneNumber = (value) => {
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Invalid phone number format. Phone number must be exactly 10 digits.');
    }
    return true;
};


const validateSignup = [
    body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({min: 3})
    .withMessage('name must be at least 3 characters long'),

    body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),

    body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .custom(isStrongPassword),

    
    body('confirmPassword')
    .notEmpty().withMessage('Confirmation password is required')
    .custom(isSamePassword),

    body('phone')
    .notEmpty().withMessage('Phone number is required')
    .custom(isValidPhoneNumber),

];


const validateLogin = [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')

]


const validatePassword = [
  body('currPassword')
    .notEmpty().withMessage('This field is required'),
  
  body('password')
    .notEmpty().withMessage('This field is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),

  body('confirmPassword')
  .notEmpty().withMessage('This field is required')
  .custom(isSamePassword),

]


module.exports = { validateSignup, validateLogin, validatePassword }