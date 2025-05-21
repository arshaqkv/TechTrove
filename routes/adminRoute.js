const express = require("express");
const { validateLogin } = require("../middlewares/validation");
const {
  authMiddleware,
  isAdmin,
  redirectToAdminDashboard,
} = require("../middlewares/authMiddleware");
const router = express.Router();
const {
  loadLoginAdmin,
  loginAdmin,
  loadAdminDashboard,
  getExcelReport,
  getPdfReport,
  getAllUsers,
  updateUserBlockStatus,
} = require("../controllers/adminController");
const nocache = require("nocache");

router.get("/login", redirectToAdminDashboard, nocache(), loadLoginAdmin);
router.post("/login", validateLogin, loginAdmin);
router.get("/dashboard", authMiddleware, isAdmin, loadAdminDashboard);
router.get("/dashboard/report/excel", authMiddleware, isAdmin, getExcelReport);
router.get("/dashboard/report/pdf", authMiddleware, isAdmin, getPdfReport);
router.get("/all-users", authMiddleware, isAdmin, getAllUsers);

router.post(
  "/toggle-user-status/:id",
  authMiddleware,
  isAdmin,
  updateUserBlockStatus
);

module.exports = router;
