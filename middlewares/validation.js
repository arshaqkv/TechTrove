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

//Custom validator for name
const isValidName = (value) =>{
  const nameRegex = /^[A-Za-z\s]+$/;
  if (!nameRegex.test(value)) {
    throw new Error('Name must contain only letters and spaces');
}
return true;
}

const isValidInput = (value) => {
  const nameRegex = /^[A-Za-z][A-Za-z0-9\s]*$/;
  if (!nameRegex.test(value)) {
    throw new Error('Invalid input');
  }
  return true;
}
   

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
    const repeatedDigitsRegex = /^(.)\1{9}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Phone number must be exactly 10 digits.');
    }
    if (repeatedDigitsRegex.test(value)) {
      throw new Error('Enter a valid phone number');
  }
    return true;
};

const isValidPin = (value) =>{
  const pinRegex = /^\d{6}$/;
  if (!pinRegex.test(value)) {
    throw new Error('Pin must be exactly 6 digits.');
  }
  return true;
}

const validateSignup = [
    body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({min: 3})
    .withMessage('name must be at least 3 characters long')
    .custom(isValidName),

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

const validateAddress = [
  body('name')
    .trim()
    .notEmpty().withMessage('This field is required')
    .custom(isValidName),

  body('phone')
    .notEmpty().withMessage('This field is required')
    .custom(isValidPhoneNumber),


  body('addressLine1')
    .trim()
    .notEmpty().withMessage('This field is required'),

  body('addressLine2')
    .trim()
    .notEmpty().withMessage('This field is required'),

  body('city')
    .trim()
    .notEmpty().withMessage('This field is required'),

  body('state')
    .trim()
    .notEmpty().withMessage('This field is required'),

  body('pinCode')
    .notEmpty().withMessage('This field is required')
    .custom(isValidPin)
]

const validateProfile = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({min: 3})
    .withMessage('name must be at least 3 characters long')
    .custom(isValidName),

  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .custom(isValidPhoneNumber),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
]


const validateProduct = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({min: 3})
    .withMessage('Title must be at least 5 characters long')
    .custom(isValidInput),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required'),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isInt({ gt: 0 }).withMessage('Price must be greater than zero'),
    
    body('stock_count')
    .notEmpty().withMessage('Stock is required')
    .isInt({ min: 0 }).withMessage('Stock should be a positive value'),
    
    body('category')
    .notEmpty().withMessage('Category is required'),   

    body('brand')
    .notEmpty().withMessage('Brand is required')
    
]

const validateCoupon = [
  body('code')
    .trim()
    .notEmpty().withMessage('This field is required')
    .isLength({min: 5})
    .withMessage('Title must be at least 5 characters long'),
    
  
  body('discount')
    .trim()
    .notEmpty().withMessage('This field is required')
    .isInt({ min: 0 }).withMessage('Discount value must be greater than zero'),
  
  body('minBill')
    .notEmpty().withMessage('This field is required')
    .isFloat({ gt: 0 }).withMessage('Minimum bill must be greater than zero'),
    
  body('expiry')
    .notEmpty().withMessage('This field is required')
       
]

const validateOffer = [
  body('offerTarget')
    .trim()
    .notEmpty().withMessage('This field is required'),

    body('targetId')
    .trim()
    .notEmpty().withMessage('This field is required')
    
       
]



module.exports = { validateSignup, validateLogin, validatePassword,validateAddress, validateProfile, validateProduct,validateCoupon, validateOffer }