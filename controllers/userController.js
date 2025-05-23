const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel");
const Otp = require("../models/otpModel");
const Wallet = require("../models/walletModel");
const Banner = require("../models/bannerModel");
const { generateToken } = require("../config/jwToken");
const { validationResult } = require("express-validator");
const validateMongoDbId = require("../utils/validateMongodbID");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mailer = require("../helpers/nodemailer");
const { oneMinuteExpiry, fiveMinuteExpiry } = require("../helpers/otpValidate");
const moment = require("moment");
const PDFDocument = require("pdfkit");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const fetchProductsAndBanners = async () => {
  try {
    const products = await Product.find({ isDeleted: false }).limit(10);
    const banners = await Banner.find({});
    const processedProducts = await Promise.all(
      products.map(async (product) => {
        const { originalPrice, offerPrice, discountPercentage } =
          await product.getEffectivePrice();
        return {
          ...product.toObject(),
          originalPrice,
          offerPrice,
          discountPercentage,
        };
      })
    );
    return { processedProducts, banners };
  } catch (error) {
    console.log(error);
  }
};

//landing page
const landingPage = async (req, res) => {
  try {
    let user;
    const token = req.cookies.jwt;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userData = await User.findById(decoded?.id);
      user = userData;
    }
    let cart;
    if (user) {
      cart =
        (await Cart.findOne({ orderby: user._id })
          .populate("products.product")
          .exec()) || null;
    }
    const { processedProducts, banners } = await fetchProductsAndBanners();
    res.render("landingPage", {
      products: processedProducts,
      banners,
      user,
      cart,
    });
  } catch (error) {
    console.log(error);
  }
};

//product listing
const loadDashboard = async (req, res) => {
  try {
    const filterParams = req.query.filter || {};
    const sortParam = req.query.sort || "";

    const filter = { isDeleted: false };

    if (filterParams.category) {
      const category = await Category.findOne({
        title: filterParams.category,
        isDeleted: false,
      }).exec();
      filter.category = category ? category._id : null;
    }

    if (filterParams.brand) {
      filter.brand = { $in: filterParams.brand.split(",") };
    }

    if (filterParams.price) {
      const price = parseInt(filterParams.price);
      filter.price = { $lte: price };
    }

    if (filterParams.search) {
      const cleanedSearch = filterParams.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(cleanedSearch, "i");
      filter.$or = [{ title: searchRegex }, { brand: searchRegex }];
    }

    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    const [products, categories, banners] = await Promise.all([
      Product.find(filter).populate("category").exec(),
      Category.find({ isDeleted: false }).exec(),
      Banner.find({}).exec(),
    ]);

    // Calculate effective prices for each product
    const processedProducts = await Promise.all(
      products.map(async (product) => {
        const { originalPrice, offerPrice, discountPercentage } =
          await product.getEffectivePrice();
        return {
          ...product.toObject(),
          originalPrice,
          offerPrice,
          discountPercentage,
        };
      })
    );

    // Sort products based on the effective price if needed
    if (sortParam === "price-asc" || sortParam === "price-desc") {
      processedProducts.sort((a, b) => {
        const priceA = a.offerPrice || a.originalPrice;
        const priceB = b.offerPrice || b.originalPrice;
        return sortParam === "price-asc" ? priceA - priceB : priceB - priceA;
      });
    } else {
      let sort = {};

      switch (sortParam) {
        case "rating":
          sort = { totalRating: -1 };
          break;
        case "featured":
          sort = { featured: -1 };
          break;
        case "new-arrivals":
          sort = { createdAt: -1 };
          break;
        case "a-z":
          sort = { title: 1 };
          break;
        case "z-a":
          sort = { title: -1 };
          break;
        default:
          sort = { popularity: -1 };
          break;
      }

      processedProducts.sort((a, b) => {
        for (const key in sort) {
          if (sort[key] === 1) {
            if (a[key] > b[key]) return 1;
            if (a[key] < b[key]) return -1;
          } else {
            if (a[key] < b[key]) return 1;
            if (a[key] > b[key]) return -1;
          }
        }
        return 0;
      });
    }

    // Pagination on the sorted products
    const count = processedProducts.length;
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;
    const paginatedProducts = processedProducts.slice(skip, skip + limit);

    const pagination = {
      totalPages,
      page,
      limit,
      count,
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        active: i + 1 === page,
      })),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return res.render("userDashboard", {
      user,
      products: paginatedProducts,
      categories,
      pagination,
      banners,
      cart,
    });
  } catch (error) {
    console.log(error);
  }
};

// Registration page
const userSignup = async (req, res) => {
  try {
    res.render("signup");
  } catch (error) {
    throw new Error(error);
  }
};

//Register a user
const signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.mapped() });
    }

    const { email, name, password, phone } = req.body;
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ error: "User Already Exists" });
    }
    // Simulating OTP sending function
    sendOtp({ email, name }, res);

    return res.status(201).json({
      success: true,
      message: "OTP sent",
      data: { email, name, password, phone },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred during signup" });
  }
};

// const sendOtp =async ({ email, _id}, res) =>{
const sendOtp = async ({ email, name }, res) => {
  try {
    //generate otp
    const g_otp = await Math.floor(100000 + Math.random() * 900000);

    const currDate = new Date();
    const otpEntry = await Otp.findOneAndUpdate(
      { email: email },
      { otp: g_otp, timestamp: new Date(currDate.getTime()) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const message =
      "<h2>Hi " +
      name +
      " , Welcome to TechTrove </h2>,<p>Please confirm your OTP</p> <br> Here is your OTP code: <h4></p>" +
      g_otp +
      " </h4>";
    mailer.sendVerificationMail(email, "Otp Verification code", message);
  } catch (error) {
    throw new Error(error);
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email, name } = req.body;

    sendOtp({ email, name }, res);
    return res.status(200).json({ success: "OTP resent successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to resend OTP" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name, password, phone } = req.body;
    const otpData = await Otp.findOne({ email, otp });

    if (!otpData) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const oldOtp = await oneMinuteExpiry(otpData.timestamp);
    if (oldOtp) {
      return res.status(400).json({ error: "OTP expired" });
    }

    const user = new User({ name, email, password, phone, isVerified: true });
    await user.save();
    await Otp.deleteOne({ email });

    return res.status(200).json({ success: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ error: "An error occurred" });
  }
};

//load user login page
const userLogin = async (req, res) => {
  try {
    res.render("login", { errors: {} });
  } catch (error) {
    console.log(error);
  }
};

//Login a user
const loginUserCntrl = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("login", {
        errors: errors.mapped(),
        email: req.body.email,
      });
    }

    const { email, password } = req.body;

    // Check User Exists or Not
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.status(401).render("login", { error: "User not registered" });
    }

    if (findUser.googleId) {
      return res
        .status(401)
        .render("login", { error: "Please SignIn through Google" });
    }

    if (findUser.isBlocked) {
      return res.status(401).render("login", { error: "Account is Blocked" });
    }

    const isPasswordCorrect = await findUser.isPasswordMatched(password);

    if (!isPasswordCorrect) {
      return res.status(401).render("login", { error: "Invalid Credentials" });
    }

    // Generate token and set cookie
    const token = generateToken(findUser._id);
    res.cookie("jwt", token, { httpOnly: true });

    return res.status(200).redirect("/");
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .render("login", { error: "An error occurred during login" });
  }
};

// Helper function to sum an array
function sumArray(arr) {
  return arr.reduce((acc, val) => acc + val, 0);
}

const logout = async (req, res) => {
  res.clearCookie("jwt");
  return res.redirect("/");
};

const loadUpdateUser = async (req, res) => {
  const user = req.user;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    res.render("updateUser", { user, cart });
  } catch (error) {
    console.log(error);
  }
};

const profileSendOtp = async (req, res) => {
  const { email, name } = req.body;
  console.log(email, name);
  try {
    const g_otp = await Math.floor(100000 + Math.random() * 900000);
    const currDate = new Date();
    const otpEntry = await Otp.findOneAndUpdate(
      { email: email },
      { otp: g_otp, timestamp: new Date(currDate.getTime()) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const message =
      "<h2>Hi " +
      name +
      " , Welcome to TechTrove </h2>,<p>Please confirm your OTP</p> <br> Here is your OTP code: <h4></p>" +
      g_otp +
      " </h4>";
    mailer.sendVerificationMail(email, "Otp Verification code", message);
    res.json({ success: true, email });
  } catch (error) {
    console.log(error);
  }
};

const profileVerifyOtp = async (req, res) => {
  const { otp, email } = req.body;
  const { id } = req.user;
  console.log(otp, email);
  try {
    const otpData = await Otp.findOne({ email, otp });
    if (!otpData) {
      return res
        .status(400)
        .json({ success: false, message: "You entered wrong otp" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        email: email,
      },
      {
        new: true,
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

//Update a user
const updateAUser = async (req, res) => {
  const user = req.user;
  const { _id } = user;
  const { name, phone } = req.body;
  validateMongoDbId(_id);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.mapped() });
    }

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        name: name,
        phone: phone,
      },
      {
        new: true,
      }
    );
    res.status(201).json(updatedUser);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

const loadPassword = async (req, res) => {
  const user = req.user;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    res.render("changePassword", { user, cart });
  } catch (error) {
    console.log(error);
  }
};

const updatePassword = async (req, res) => {
  const { currPassword, password: newPassword } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("changePassword", {
        errors: errors.mapped(),
        ...req.body,
      });
    }
    const user = req.user;
    const { _id } = user;
    console.log(newPassword);
    if (_id && (await user.isPasswordMatched(currPassword))) {
      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const changedPassword = await User.findByIdAndUpdate(
          _id,
          {
            password: hashedPassword,
          },
          {
            new: true,
          }
        );
        console.log(changedPassword);
        res.redirect("/profile/edit-user");
      }
    } else {
      res
        .status(401)
        .render("changePassword", { error: "Invalid Current Password" });
    }
  } catch (error) {
    console.log(error);
  }
};

//Get all users
const getAllUsers = async (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  try {
    const count = await User.countDocuments({ isAdmin: false });
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;
    const users = await User.find({ isAdmin: false }).skip(skip).limit(limit);

    const pagination = {
      totalPages,
      page,
      limit,
      count,
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        active: i + 1 === page,
      })),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
    res.status(201).render("users", { users, pagination, user });
  } catch (error) {
    throw new Error(error);
  }
};

//Get a single user
const getAUser = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const totalOrder = await Order.countDocuments({ orderby: _id });
    const totalDelivered = await Order.countDocuments({
      orderby: _id,
      orderStatus: "Delivered",
    });
    const totalCancelled = await Order.countDocuments({
      orderby: _id,
      orderStatus: "Cancelled",
    });
    let cart =
      (await Cart.findOne({ orderby: _id })
        .populate("products.product")
        .exec()) || null;
    const user = await User.findById(_id).populate("defaultAddress").exec();
    res.status(200).render("profile.hbs", {
      user,
      cart,
      totalOrder,
      totalDelivered,
      totalCancelled,
    });
  } catch (error) {
    throw new Error(error);
  }
};

//cart
const userCart = async (req, res) => {
  const { cart } = req.body;
  const { _id } = req.user;

  validateMongoDbId(_id);

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let cartToUpdate = await Cart.findOne({ orderby: user._id });

    const couponCode = req.session.couponCode;
    const appliedCoupon = couponCode
      ? await Coupon.findOne({ code: couponCode })
      : null;

    if (cartToUpdate) {
      // Cart exists for the user, update it
      for (let i = 0; i < cart.length; i++) {
        const { product: productId, count } = cart[i];
        const index = cartToUpdate.products.findIndex((p) =>
          p.product.equals(productId)
        );

        if (index !== -1) {
          // Product already exists in the cart, update count
          cartToUpdate.products[index].count += count;
        } else {
          // Product doesn't exist in cart, add it
          let product = await Product.findById(productId).exec();

          if (product) {
            const { originalPrice, offerPrice } =
              await product.getEffectivePrice();
            const finalPrice = offerPrice !== null ? offerPrice : originalPrice;

            cartToUpdate.products.push({
              product: productId,
              count,
              originalPrice,
              finalPrice,
            });
          } else {
            return res.status(404).json({ message: "Product not found" });
          }
        }
      }

      // Recalculate cart total

      cartToUpdate.cartTotal = 0;
      cartToUpdate.totalAfterDiscount = 0;
      const individualTotals = await Promise.all(
        cartToUpdate.products.map(async (productItem) => {
          const { product: productId, count } = productItem;
          const product = await Product.findById(productId).exec();
          const { originalPrice, offerPrice } =
            await product.getEffectivePrice();
          const finalPrice = offerPrice !== null ? offerPrice : originalPrice;

          const total = finalPrice * count;

          cartToUpdate.cartTotal += total;
          return { productId: product._id, total };
        })
      );

      if (appliedCoupon) {
        cartToUpdate.totalAfterDiscount =
          cartToUpdate.cartTotal - appliedCoupon.discount;
      } else {
        cartToUpdate.totalAfterDiscount = cartToUpdate.cartTotal;
      }

      await cartToUpdate.save();
      return res.status(200).json({
        cartTotal: cartToUpdate.cartTotal,
        individualTotals,
      });
    } else {
      // No cart exists for the user, create a new one
      let products = [];
      let cartTotal = 0;

      for (let i = 0; i < cart.length; i++) {
        const { product: productId, count } = cart[i];
        let product = await Product.findById(productId).exec();

        if (product) {
          const { originalPrice, offerPrice } =
            await product.getEffectivePrice();
          const finalPrice = offerPrice !== null ? offerPrice : originalPrice;

          products.push({
            product: productId,
            count,
            originalPrice,
            finalPrice,
          });
          cartTotal += finalPrice * count;
        } else {
          return res.status(404).json({ message: "Product not found" });
        }
      }

      const newCart = await Cart.create({
        products,
        cartTotal,
        orderby: user._id,
        totalAfterDiscount: cartTotal,
      });

      return res.status(201).redirect("/cart");
    }
  } catch (error) {
    console.error(error);
  }
};

//load user cart
const loadUserCart = async (req, res) => {
  const user = req.user;
  const { _id } = user;
  validateMongoDbId(_id);

  try {
    const couponCode = req.session.couponCode;
    const coupons = await Coupon.find({});
    const appliedCoupon = await Coupon.findOne({ code: couponCode });

    // Fetch cart with populated products
    let cart = await Cart.findOne({ orderby: _id })
      .populate("products.product")
      .exec();
    if (cart) {
      // Transform products with prices
      const productsWithPrices = await Promise.all(
        cart.products.map(async (productItem) => {
          let product = productItem.product;

          // Compute effective price details
          const { originalPrice, offerPrice, discountPercentage } =
            await product.getEffectivePrice();
          let finalPrice = offerPrice !== null ? offerPrice : originalPrice;
          let offerSavings =
            offerPrice !== null
              ? (originalPrice - offerPrice) * productItem.count
              : 0;

          // Update product details
          product.effectivePrice = finalPrice;
          product.originalPrice = originalPrice;
          product.discountPercentage = discountPercentage;
          product.offerSavings = offerSavings.toFixed(2);

          // Return updated product item
          return {
            ...productItem.toObject(),
            product: product,
          };
        })
      );

      // Update cart's products with transformed products
      cart.products = productsWithPrices;
    }
    res.render("cart", { cart, user, coupons, appliedCoupon });
  } catch (error) {
    console.error("Error loading user cart:", error);
    // Handle error appropriately, e.g., render an error page
    res.status(500).render("error", {
      message: "Error loading cart. Please try again later.",
    });
  }
};

//decrease quantity of products in cart
const updateCart = async (req, res) => {
  const { productId, newQuantity } = req.body;
  const { _id } = req.user;

  validateMongoDbId(_id);

  try {
    const couponCode = req.session.couponCode;
    const appliedCoupon = couponCode
      ? await Coupon.findOne({ code: couponCode })
      : null;

    const cart = await Cart.findOne({ orderby: _id })
      .populate("products.product")
      .exec();

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.products.findIndex(
      (p) => p.product._id.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const productItem = cart.products[itemIndex];
    const oldQuantity = productItem.count;
    productItem.count = newQuantity;

    const { originalPrice, offerPrice } =
      await productItem.product.getEffectivePrice();
    const totalPrice = offerPrice !== null ? offerPrice : originalPrice;

    const offerSavings =
      offerPrice !== null ? (originalPrice - offerPrice) * newQuantity : 0;

    productItem.product.effectivePrice = totalPrice;
    productItem.product.originalPrice = originalPrice;
    productItem.product.discountPercentage =
      ((originalPrice - totalPrice) / originalPrice) * 100;
    productItem.product.offerSavings = offerSavings.toFixed(2);

    // Recalculate cart total
    let updatedCartTotal = cart.products.reduce(
      (total, product) => total + product.count * product.finalPrice,
      0
    );
    let totalAfterDiscount = updatedCartTotal;
    if (appliedCoupon) {
      totalAfterDiscount -= appliedCoupon.discount;
    }

    const updatedCart = await Cart.findOneAndUpdate(
      { orderby: _id },
      {
        $set: {
          products: cart.products,
          cartTotal: updatedCartTotal,
          totalAfterDiscount: totalAfterDiscount,
        },
      },
      { new: true }
    )
      .populate("products.product")
      .exec();

    const subTotal =
      updatedCart.products.find((p) => p.product._id.toString() === productId)
        ?.count *
        updatedCart.products.find((p) => p.product._id.toString() === productId)
          ?.price || 0;

    res.status(200).json({
      cartTotal: updatedCart.cartTotal,
      totalAfterDiscount,
      count: cart.products[itemIndex].count,
      offerSavings: productItem.product.offerSavings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//remove item form cart
const removeCartItem = async (req, res) => {
  const { productId } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const cart = await Cart.findOne({ orderby: _id })
      .populate("products.product")
      .exec();
    if (cart) {
      const itemIndex = cart.products.findIndex(
        (p) => p.product._id.toString() === productId
      );
      if (itemIndex !== -1) {
        cart.products.splice(itemIndex, 1);

        // Check if the cart is empty after removing the item
        if (cart.products.length === 0) {
          await Cart.deleteOne({ orderby: _id });
          req.session.couponCode = null;
          return res
            .status(200)
            .json({ message: "Cart deleted as it was empty" });
        }

        // Recalculate cart total
        cart.cartTotal = cart.products.reduce(
          (acc, item) => acc + item.finalPrice * item.count,
          0
        );
        cart.totalAfterDiscount = cart.cartTotal;
        await cart.save();
        req.session.couponCode = null;
        return res.status(200).json(cart);
      } else {
        return res.status(404).json({ message: "Product not found in cart" });
      }
    } else {
      return res.status(404).json({ message: "Cart not found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//apply coupon
const userApplyCoupon = async (req, res) => {
  const user = req.user;
  const { _id } = user;
  const { couponCode } = req.body;
  req.session.couponCode = couponCode;
  try {
    const cart = await Cart.findOne({ orderby: _id })
      .populate("products.product")
      .exec();
    const coupon = await Coupon.findOne({ code: couponCode });
    if (coupon === null) {
      return res.status(400).json({ message: "Invalid coupon code" });
    }
    if (coupon.usedBy.includes(_id)) {
      return res.status(400).json({ message: "Coupon has already been used" });
    }
    if (coupon.expiry < Date.now()) {
      return res.status(400).json({ message: "Coupon has expired" });
    }
    if (cart.cartTotal < coupon.minBill) {
      return res.status(400).json({
        message: `Minimum bill amount should be Rs.${coupon.minBill}`,
      });
    }
    const discountAmount = coupon.discount;
    const totalAfterDiscount = cart.cartTotal - discountAmount;
    cart.totalAfterDiscount = totalAfterDiscount;
    await cart.save();

    res.json({
      success: true,
      cartTotal: totalAfterDiscount,
      discount: discountAmount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const userRemoveCoupon = async (req, res) => {
  const user = req.user;
  const { _id } = user;
  try {
    const cart = await Cart.findOne({ orderby: _id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    cart.totalAfterDiscount = cart.cartTotal;
    await cart.save();

    // Clear the coupon code from session
    req.session.couponCode = null;

    res.json({ success: true, cartTotal: cart.totalAfterDiscount });
  } catch (error) {
    console.log(error);
  }
};

const userCoupons = async (req, res) => {
  const user = req.user;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    const allCoupons = await Coupon.find({}).exec();
    const currentDate = moment();

    const coupons = allCoupons.map((coupon) => {
      const isExpired = moment(coupon.expiry).isBefore(currentDate);
      return { ...coupon._doc, isExpired };
    });
    res.render("user-coupons", { coupons, user, cart });
  } catch (error) {
    console.log(error);
  }
};

function generateOrderId() {
  const timestamp = Date.now().toString().slice(-4);
  const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
  const hash = crypto
    .createHash("sha256")
    .update(timestamp + randomNum)
    .digest("hex")
    .slice(0, 2); // First 2 characters of the hash
  return `${timestamp}${randomNum}${hash}`;
}

const createOrder = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  const { paymentIntent } = req.body;
  couponCode = req.session.couponCode;
  try {
    const cart = await Cart.findOne({ orderby: _id }).populate(
      "products.product"
    );
    console.log(cart);
    if (!cart) {
      return res
        .status(401)
        .json({ success: false, message: "Cart not found" });
    }

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (coupon) {
        coupon.usedBy.push(_id);
        await coupon.save();
        req.session.couponCode = null;
      }
    }

    const totalPrice = cart.totalAfterDiscount;
    const orderId = generateOrderId();

    // Handle different payment intents
    if (paymentIntent === "Razorpay") {
      // Create a Razorpay order
      const options = {
        amount: totalPrice * 100, // amount in paise
        currency: "INR",
        receipt: `receipt_order_${Date.now()}`,
      };
      const razorpayOrder = await razorpay.orders.create(options);
      if (!razorpayOrder) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to create Razorpay order" });
      }

      res.status(201).json({
        success: true,
        razorpayOrder,
        totalPrice,
        products: cart.products,
      });
    } else if (paymentIntent === "COD") {
      // Handle COD orders directly
      await finalizeOrder(cart, _id, paymentIntent, totalPrice, orderId, null);
      res
        .status(201)
        .json({ success: true, message: "Order placed successfully" });
    } else if (paymentIntent === "Wallet") {
      const user = await User.findById(_id);
      if (user.walletBalance < totalPrice) {
        return res
          .status(400)
          .json({ success: false, message: "Insufficient wallet balance" });
      }

      user.walletBalance -= totalPrice;
      await user.save();

      const order = await finalizeOrder(
        cart,
        _id,
        paymentIntent,
        totalPrice,
        orderId,
        null
      );
      const walletTransaction = await Wallet.create({
        userId: _id,
        amount: totalPrice,
        type: "debit",
        orderId: order._id, // Use the order _id here
      });

      res
        .status(201)
        .json({ success: true, message: "Order placed successfully" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid payment intent" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const finalizeOrder = async (
  cart,
  userId,
  paymentIntent,
  totalPrice,
  orderId,
  razorpayOrderId
) => {
  const order = new Order({
    orderId: orderId,
    products: cart.products,
    totalPrice: totalPrice,
    paymentIntent: paymentIntent,
    orderby: userId,
    razorpayOrderId: razorpayOrderId,
  });
  await order.save();

  for (const item of cart.products) {
    const product = await Product.findById(item.product._id);
    if (product) {
      product.stock_count -= item.count;
      product.sold += item.count;
      await product.save();
    }
  }

  // Clear the cart after order creation
  await Cart.deleteOne({ orderby: userId });

  return order;
};

const verifyRazorpayPayment = async (req, res) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderData } =
    req.body;

  // Verify the payment signature
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const generatedSignature = hmac.digest("hex");

  if (generatedSignature !== razorpaySignature) {
    return res
      .status(400)
      .json({ success: false, message: "Payment verification failed" });
  }

  const orderId = generateOrderId();
  // Payment is verified, create the order
  const order = new Order({
    ...orderData,
    orderId: orderId,
  });
  await order.save();

  for (const item of orderData.products) {
    const product = await Product.findById(item.product._id);
    if (product) {
      product.stock_count -= item.count;
      product.sold += item.count;
      await product.save();
    }
  }

  // Clear the cart after order creation
  await Cart.deleteOne({ orderby: orderData.orderby });

  res.status(201).json({ success: true, orderId: order._id });
};

const loadCreateOrder = async (req, res) => {
  const user = req.user;
  try {
    const cart = await Cart.findOne({ orderby: user._id })
      .populate({
        path: "products.product",
        // Specify the fields you want to populate
      })
      .exec();

    const appliedCoupon = req.session.couponCode || "";
    const coupon = await Coupon.findOne({ code: appliedCoupon });

    const address = await Address.find({ user: user._id });
    res.render("checkout", { user, cart, address, coupon });
  } catch (error) {
    console.log(error);
  }
};

const getOrder = async (req, res) => {
  const user = req.user;
  const { _id } = user;
  validateMongoDbId(_id);

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    const count = await Order.countDocuments({ orderby: _id });
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;

    const userOrders = await Order.find({ orderby: _id })
      .populate({
        path: "orderby",
        populate: {
          path: "defaultAddress",
          model: "Address",
        },
      })
      .populate("products.product")
      .sort({ createdAt: -1 }) // Sort by most recent first
      .skip(skip)
      .limit(limit)
      .exec();

    const pagination = {
      totalPages,
      page,
      count,
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        active: i + 1 === page,
      })),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
    res.render("product-orders", {
      user,
      cart,
      orders: userOrders,
      pagination,
      count,
    });
  } catch (error) {
    console.log(error);
  }
};

const loadUpdateStatus = async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  try {
    const order = await Order.findById(id)
      .populate({
        path: "products.product",
        populate: {
          path: "category",
          model: "Category",
        },
      })
      .populate({
        path: "orderby",
        populate: {
          path: "defaultAddress",
          model: "Address", // Ensure 'Address' is the correct model name
        },
      });

    console.log(order);
    res.render("orderStatus", { user, order });
  } catch (error) {
    console.log(error);
  }
};

const getOrderInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch order details using orderId
    const order = await Order.findById(id)
      .populate({
        path: "orderby",
        populate: {
          path: "defaultAddress",
          model: "Address", // Ensure 'Address' is the correct model name
        },
      })
      .populate("products.product");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      let pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Length", Buffer.byteLength(pdfData));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-disposition",
        `attachment; filename=order-${order.orderId}-invoice.pdf`
      );
      res.send(pdfData);
    });

    const tableTop = 260; // Adjusted Y coordinate for top of the table
    const tableMargin = 25; // Margin for table content

    doc.fontSize(20).text("TechTrove", { align: "center" });

    doc.fillColor("red").fontSize(9).text("Order Invoice", { align: "center" });
    doc.fillColor("black");
    doc.moveDown();
    doc.fontSize(11).text(`Order ID: #${order.orderId}`, { align: "left" });
    doc
      .fontSize(11)
      .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, {
        align: "left",
      });
    doc.moveDown();
    doc
      .fontSize(11)
      .text(`Payment Method: ${order.paymentIntent}`, { align: "left" });
    doc.moveDown();
    // Add billing address details
    doc
      .fontSize(12)
      .text("Billing Address:", { align: "left", underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Name: ${order.orderby.name}`);
    doc.text(`Address Line 1: ${order.orderby.defaultAddress.addressLine1}`);
    doc.text(`Address Line 2: ${order.orderby.defaultAddress.addressLine2}`);
    doc.text(`City: ${order.orderby.defaultAddress.city}`);
    doc.text(`State: ${order.orderby.defaultAddress.state}`);
    doc.text(`Pin Code: ${order.orderby.defaultAddress.pinCode}`);
    doc.moveDown();

    // Table headers
    const headers = [
      "SI",
      "Product",
      "Quantity",
      "Orignal Price",
      "Discounted Price",
      "Subtotal",
    ];
    const columnWidths = [30, 180, 50, 90, 100, 90];
    const tableY = tableTop + tableMargin;

    // Draw headers
    doc.font("Helvetica-Bold").fontSize(11);
    headers.forEach((header, index) => {
      doc.text(
        header,
        tableMargin + sumArray(columnWidths.slice(0, index)),
        tableY,
        { width: columnWidths[index], align: "center" }
      );
    });

    const headerBottomY = tableY + 15; // Adjust height of header
    doc
      .moveTo(tableMargin, headerBottomY)
      .lineTo(tableMargin + sumArray(columnWidths), headerBottomY)
      .stroke();

    // Draw rows
    let currentY = headerBottomY + tableMargin / 2;
    doc.font("Helvetica").fontSize(10);
    order.products.forEach((product, index) => {
      const subtotal = product.count * product.finalPrice;

      const rowData = [
        index + 1,
        product.product.title,
        product.count,
        `Rs.${product.originalPrice}`,
        `Rs.${product.finalPrice}`,
        `Rs.${subtotal}`,
      ];

      rowData.forEach((data, index) => {
        doc.text(
          data,
          tableMargin + sumArray(columnWidths.slice(0, index)),
          currentY,
          { width: columnWidths[index], align: "center" }
        );
      });

      currentY += 20;
    });

    // Total amount and discount
    doc.moveDown();
    const totalOriginalPrice = order.products.reduce(
      (acc, p) => acc + p.count * p.originalPrice,
      0
    );
    const totalProductsPrice = order.products.reduce(
      (acc, p) => acc + p.count * p.finalPrice,
      0
    );
    const discount = totalOriginalPrice - totalProductsPrice;

    // const totalProductsPrice = order.products.reduce((acc, p) => acc + (p.count * p.product.price), 0);
    // const discount = totalProductsPrice - order.totalPrice;

    doc
      .font("Helvetica-Bold")
      .text(`Total Amount: Rs.${order.totalPrice}`, tableMargin, currentY + 20);
    doc.moveDown();
    doc
      .font("Helvetica-Bold")
      .text(`Discount: Rs.${discount}`, tableMargin, currentY + 40);

    doc.end();
  } catch (error) {
    console.error("Error generating PDF report:", error);
    res.status(500).json({ message: "Failed to generate PDF report" });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updateOrderStatus = await Order.findByIdAndUpdate(
      id,
      { orderStatus: status },
      { new: true }
    );
    if (!updateOrderStatus) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Respond with success message
    res.json({
      success: true,
      message: "Order status updated successfully",
      updateOrderStatus,
    });
  } catch (error) {
    console.log(error);
  }
};

const updateProductStockAndSold = async (productId, count) => {
  const product = await Product.findById(productId);
  if (product) {
    product.stock_count += count;
    product.sold -= count;
    await product.save();
  }
};

const handleOrderAction = async (req, res, action) => {
  const { id } = req.params;
  const { feedback } = req.body;
  const user = req.user;
  validateMongoDbId(id);
  try {
    const order = await Order.findById(id)
      .populate("products.product")
      .populate("orderby");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Perform the action (cancel or return)
    if (action === "cancel") {
      order.orderStatus = "Cancelled";
    } else if (action === "return") {
      order.orderStatus = "Returned";
      order.feedback = feedback;
    }

    await order.save();

    // Update product stock and sold counts
    for (const item of order.products) {
      await updateProductStockAndSold(item.product._id, item.count);
    }

    // Add amount to user's wallet
    const findUser = await User.findById(user._id);

    if (findUser) {
      const refundAmount = order.totalPrice;
      findUser.walletBalance += refundAmount;

      await findUser.save();

      // Add transaction to wallet
      await Wallet.create({
        userId: findUser._id,
        amount: refundAmount,
        type: "credit",
        orderId: order._id,
      });
    }

    const successMessage =
      action === "cancel"
        ? "Order cancelled successfully and amount credited to wallet"
        : "Order returned successfully and amount credited to wallet";
    res.status(200).json({ success: true, message: successMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const cancelOrder = async (req, res) => {
  await handleOrderAction(req, res, "cancel");
};

const returnOrder = async (req, res) => {
  await handleOrderAction(req, res, "return");
};

const getAllOrders = async (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  try {
    const count = await Order.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate("orderby")
      .populate("products.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const pagination = {
      totalPages,
      page,
      limit,
      count,
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        active: i + 1 === page,
      })),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    res.render("view-orders", { orders, user, pagination, count });
  } catch (error) {
    console.log(error);
  }
};

const loadWalletTransactions = async (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    const count = await Wallet.countDocuments({ userId: user._id });
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;

    const wallet = await Wallet.find({ userId: user._id })
      .populate("orderId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const pagination = {
      totalPages,
      page,
      limit,
      count,
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        active: i + 1 === page,
      })),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    console.log(pagination);
    res.render("transaction", { user, cart, wallet, pagination });
  } catch (error) {
    console.log(error);
  }
};

//Delete a user
const deleteAUser = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const deleteUser = await User.findByIdAndDelete(_id);
    res.redirect("/login");
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  landingPage,
  loadDashboard,
  userSignup,
  userLogin,
  signup,
  loginUserCntrl,
  logout,
  getAllUsers,
  getAUser,
  deleteAUser,
  loadUpdateUser,
  updateAUser,
  profileSendOtp,
  profileVerifyOtp,
  resendOtp,
  verifyOtp,
  loadPassword,
  updatePassword,
  loadUserCart,
  userCart,
  updateCart,
  removeCartItem,
  createOrder,
  verifyRazorpayPayment,
  loadCreateOrder,
  getOrder,
  loadUpdateStatus,
  updateOrderStatus,
  cancelOrder,
  returnOrder,
  getAllOrders,
  userApplyCoupon,
  userCoupons,
  userRemoveCoupon,
  getOrderInvoice,
  loadWalletTransactions,
};
