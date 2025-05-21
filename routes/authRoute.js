const express = require("express");
const noCache = require("nocache");
const {
  signup,
  loginUserCntrl,
  getAllUsers,
  getAUser,
  deleteAUser,
  updateAUser,
  userSignup,
  userLogin,
  loadDashboard,
  logout,
  resendOtp,
  verifyOtp,
  loadUpdateUser,
  loadPassword,
  updatePassword,
  loadUserCart,
  userCart,
  updateCart,
  removeCartItem,
  loadCreateOrder,
  createOrder,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  userApplyCoupon,
  userCoupons,
  userRemoveCoupon,
  verifyRazorpayPayment,
  profileSendOtp,
  profileVerifyOtp,
  loadUpdateStatus,
  returnOrder,
  getOrderInvoice,
  loadWalletTransactions,
  landingPage,
} = require("../controllers/userController");
const {
  validateSignup,
  validateLogin,
  validatePassword,
  validateProfile,
} = require("../middlewares/validation");
const {
  authMiddleware,
  isAdmin,
  redirectIfAuthenticated,
} = require("../middlewares/authMiddleware");
const nocache = require("nocache");
const router = express.Router();

router.get("/", landingPage);
router.post("/signup", validateSignup, signup);
router.get("/signup", nocache(), userSignup);
//otp verification routes
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);

router.post("/login", validateLogin, loginUserCntrl);
router.get("/login", redirectIfAuthenticated, nocache(), userLogin);
router.get("/shop", authMiddleware, noCache(), loadDashboard);
router.get("/logout", logout);
router.get("/profile", authMiddleware, getAUser);
router.delete("/:id", authMiddleware, deleteAUser);
router.get("/profile/edit-user", authMiddleware, loadUpdateUser);
router.put(
  "/profile/update-user",
  validateProfile,
  authMiddleware,
  updateAUser
);
router.post("/profile/send-otp", authMiddleware, profileSendOtp);
router.put("/profile/verify-otp", authMiddleware, profileVerifyOtp);
router.get("/profile/change-password", authMiddleware, loadPassword);
router.put(
  "/update-password",
  validatePassword,
  authMiddleware,
  updatePassword
);
router.get("/cart", authMiddleware, loadUserCart);
router.post("/cart", authMiddleware, userCart);
router.put("/cart/update", authMiddleware, updateCart);
router.put("/cart/remove", authMiddleware, removeCartItem);
router.post("/apply-coupon", authMiddleware, userApplyCoupon);
router.post("/remove-coupon", authMiddleware, userRemoveCoupon);
router.get("/coupons", authMiddleware, userCoupons);
router.get("/checkout", authMiddleware, loadCreateOrder);
router.post("/verify-payment", authMiddleware, verifyRazorpayPayment);
router.post("/checkout", authMiddleware, createOrder);
router.get("/get-orders", authMiddleware, getOrder);
router.get(
  "/order/update-order/:id",
  authMiddleware,
  isAdmin,
  loadUpdateStatus
);
router.put(
  "/order/update-order/:id",
  authMiddleware,
  isAdmin,
  updateOrderStatus
);
router.put("/order/cancel-order/:id", authMiddleware, cancelOrder);
router.put("/order/return-order/:id", authMiddleware, returnOrder);
router.get("/order/all-orders", authMiddleware, isAdmin, getAllOrders);
router.get("/order/download-invoice/:id", authMiddleware, getOrderInvoice);
router.get("/transactions", authMiddleware, loadWalletTransactions);

module.exports = router;
