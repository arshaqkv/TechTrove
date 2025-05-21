const { validationResult } = require("express-validator");
const User = require("../models/userModel");
const { generateToken } = require("../config/jwToken");
const Order = require("../models/orderModel");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

//load admin login
const loadLoginAdmin = async (req, res) => {
  try {
    return res.render("adminLogin", { errors: {} });
  } catch (error) {
    throw new Error(error);
  }
};

const loginAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("adminLogin", {
        errors: errors.mapped(),
        email: req.body.email,
      });
    }

    const { email, password } = req.body;

    // Check if admin exists
    const findAdmin = await User.findOne({ email });
    if (!findAdmin) {
      return res
        .status(401)
        .render("adminLogin", { error: "Invalid Credentials" });
    }

    // Check if admin is blocked
    if (findAdmin.isBlocked) {
      return res.status(401).render("adminLogin", { error: "You are blocked" });
    }

    // Check if password matches
    const isPasswordCorrect = await findAdmin.isPasswordMatched(password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .render("adminLogin", { error: "Invalid Credentials" });
    }

    // Generate token and set cookie
    const token = generateToken(findAdmin._id);
    console.log(token);
    res.cookie("jwt", token, { httpOnly: true });

    return res.status(201).redirect("/admin/dashboard");
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .render("adminLogin", { error: "An error occurred during login" });
  }
};

//admin dashboard

const loadAdminDashboard = async (req, res) => {
  const user = req.user;
  const { startDate, endDate, salesDuration } = req.query;
  try {
    const totalOrders = await Order.countDocuments({
      orderStatus: { $nin: ["Returned", "Cancelled"] },
    });
    const totalDelivered = await Order.countDocuments({
      orderStatus: "Delivered",
    });
    const totalCanceled = await Order.countDocuments({
      orderStatus: "Cancelled",
    });
    const totalReturned = await Order.countDocuments({
      orderStatus: "Returned",
    });

    const totalRevenue = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    const paymentData = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $group: {
          _id: "$paymentIntent",
          count: { $sum: 1 },
        },
      },
    ]);

    const orderStatusData = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryData = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: "$categoryDetails",
      },
      {
        $group: {
          _id: "$categoryDetails._id",
          categoryName: { $first: "$categoryDetails.title" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          categoryName: 1,
          orderCount: 1,
        },
      },
    ]);

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(
      today.setDate(today.getDate() - today.getDay())
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const oneDaySales = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $match: {
          createdAt: { $gte: startOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalPrice" },
        },
      },
    ]);

    const oneWeekSales = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $match: {
          createdAt: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalPrice" },
        },
      },
    ]);

    const oneMonthSales = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $match: {
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalPrice" },
        },
      },
    ]);

    let customDateSales = [];
    let customDateOrders = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      customDateSales = await Order.aggregate([
        {
          $match: {
            orderStatus: { $nin: ["Cancelled", "Returned"] },
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalPrice" },
          },
        },
      ]);

      customDateOrders = await Order.find({
        $and: [
          { createdAt: { $gte: start, $lte: end } },
          { orderStatus: { $nin: ["Cancelled", "Returned"] } },
        ],
      }).populate("products.product");
    } else {
      let matchCondition;
      switch (salesDuration) {
        case "daily":
          matchCondition = { createdAt: { $gte: startOfDay } };
          break;
        case "weekly":
          matchCondition = { createdAt: { $gte: startOfWeek } };
          break;
        case "monthly":
          matchCondition = { createdAt: { $gte: startOfMonth } };
          break;
        case "yearly":
          matchCondition = { createdAt: { $gte: startOfYear } };
          break;
        default:
          matchCondition = {};
      }

      customDateSales = await Order.aggregate([
        {
          $match: {
            ...matchCondition,
            orderStatus: { $nin: ["Cancelled", "Returned"] },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalPrice" },
          },
        },
      ]);

      customDateOrders = await Order.find({
        $and: [
          matchCondition,
          { orderStatus: { $nin: ["Cancelled", "Returned"] } },
        ],
      }).populate("products.product");
    }

    totalSales = customDateSales[0] ? customDateSales[0].totalSales : 0;
    let customDiscount = 0;
    const customDateOrderDetails = customDateOrders.map((order) => {
      let orderDiscount = 0;
      const products = order.products.map((product) => {
        const totalOriginalPrice = product.originalPrice * product.count;
        const totalFinalPrice = product.finalPrice * product.count;
        const discount = totalOriginalPrice - totalFinalPrice;
        orderDiscount += discount;

        return {
          name: product.product.title,
          originalPrice: product.originalPrice,
          finalPrice: product.finalPrice,
          count: product.count,
          discount,
        };
      });

      customDiscount += orderDiscount;
      console.log(customDiscount);
      return {
        orderId: `#${order.orderId}`,
        totalPrice: order.totalPrice,
        orderStatus: order.orderStatus,
        paymentIntent: order.paymentIntent,
        products,
        discount: orderDiscount,
      };
    });

    const totalDiscount = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $addFields: {
          "products.totalOriginalPrice": {
            $multiply: ["$products.originalPrice", "$products.count"],
          },
          "products.totalFinalPrice": {
            $multiply: ["$products.finalPrice", "$products.count"],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          totalOriginalPrice: { $sum: "$products.totalOriginalPrice" },
          totalFinalPrice: { $sum: "$products.totalFinalPrice" },
        },
      },
      {
        $project: {
          totalDiscount: {
            $subtract: ["$totalOriginalPrice", "$totalFinalPrice"],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: "$totalDiscount" },
        },
      },
    ]);

    const currentYear = new Date().getFullYear();
    const monthlySales = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$totalPrice" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const monthlySalesData = Array(12).fill(0);
    monthlySales.forEach((month) => {
      monthlySalesData[month._id - 1] = month.totalSales;
    });

    // Get yearly sales data for the past 5 years
    const startYear = currentYear - 4;
    const yearlySales = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(startYear, 0, 1),
            $lte: new Date(currentYear, 11, 31),
          },
        },
      },
      {
        $group: {
          _id: { $year: "$createdAt" },
          totalSales: { $sum: "$totalPrice" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const yearlySalesData = yearlySales.map((year) => ({
      year: year._id,
      totalSales: year.totalSales,
    }));

    const currentDate = new Date();
    const currentDay = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const currentMonth = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    res.render("adminDashboard", {
      user,
      totalOrders,
      totalDelivered,
      totalCanceled,
      totalReturned,
      totalRevenue: totalRevenue[0] ? totalRevenue[0].totalRevenue : 0,
      paymentData: JSON.stringify(paymentData),
      orderStatusData: JSON.stringify(orderStatusData),
      categoryData: JSON.stringify(categoryData),
      oneDaySales: oneDaySales[0] ? oneDaySales[0].totalSales : 0,
      oneWeekSales: oneWeekSales[0] ? oneWeekSales[0].totalSales : 0,
      oneMonthSales: oneMonthSales[0] ? oneMonthSales[0].totalSales : 0,
      totalDiscount: totalDiscount[0] ? totalDiscount[0].totalDiscount : 0,
      currentDay,
      currentMonth,
      customDateOrders: customDateOrderDetails,
      startDate,
      endDate,
      salesDuration,
      monthlySalesData: JSON.stringify(monthlySalesData),
      yearlySalesData: JSON.stringify(yearlySalesData),
      customDateSales: totalSales,
      customDiscount,
    });
  } catch (error) {
    console.log(error);
  }
};

function sumArray(arr) {
  return arr.reduce((acc, val) => acc + val, 0);
}

const getExcelReport = async (req, res) => {
  const { startDate, endDate, salesDuration } = req.query;
  try {
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      switch (salesDuration) {
        case "daily":
          start = startOfDay;
          end = new Date();
          break;
        case "weekly":
          start = startOfWeek;
          end = new Date();
          break;
        case "monthly":
          start = startOfMonth;
          end = new Date();
          break;
        case "yearly":
          start = startOfYear;
          end = new Date();
          break;
        default:
          start = new Date(0);
          end = new Date();
      }
    }

    const orders = await Order.find({
      orderStatus: { $nin: ["Cancelled", "Returned"] },
      createdAt: { $gte: start, $lte: end },
    }).populate("products.product");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("TechTrove Sales Report");

    worksheet.columns = [
      { header: "SI", key: "si", width: 6 },
      { header: "Order ID", key: "orderId", width: 25 },
      { header: "Products", key: "products", width: 35 },
      { header: "Price", key: "price", width: 15 },
      { header: "Order Status", key: "orderStatus", width: 20 },
      { header: "Payment Method", key: "paymentIntent", width: 25 },
      { header: "Total Price", key: "totalPrice", width: 15 },
      { header: "Discount", key: "discount", width: 20 },
    ];

    // Bold the headers
    worksheet.getRow(1).font = { bold: true };

    let totalSum = 0;
    let discountSum = 0;
    let si = 0;
    orders.forEach((order) => {
      const totalOriginalPrice = order.products.reduce(
        (acc, p) => acc + p.count * p.originalPrice,
        0
      );
      const totalProductsPrice = order.products.reduce(
        (acc, p) => acc + p.count * p.finalPrice,
        0
      );
      const discount = totalOriginalPrice - totalProductsPrice;

      totalSum += totalProductsPrice;
      discountSum += discount;
      si++;
      worksheet.addRow({
        si: si,
        orderId: `#${order.orderId}`,
        products: order.products.map((p) => `${p.product.title}`).join("\n"),
        price: order.products
          .map((p) => `₹${p.finalPrice} x ${p.count}`)
          .join("\n"),
        orderStatus: order.orderStatus,
        paymentIntent: order.paymentIntent,
        totalPrice: `₹${order.totalPrice}`,
        discount: `₹${discount}`,
      });
    });

    worksheet.addRow({
      orderId: "",
      products: "",
      price: "",
      orderStatus: "",
      paymentIntent: "Total",
      totalPrice: `₹${totalSum}`,
      discount: `₹${discountSum}`,
    });

    const totalsRow = worksheet.getRow(worksheet.lastRow.number);
    totalsRow.font = { bold: true };

    // Apply wrap text to specific columns
    worksheet.columns.forEach((column) => {
      column.alignment = {
        wrapText: true,
        vertical: "middle",
        horizontal: "left",
      };
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${start.toDateString()}-${end.toDateString()}-report.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500).send("Error generating report");
  }
};

const getPdfReport = async (req, res) => {
  const { startDate, endDate, salesDuration } = req.query;
  try {
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      switch (salesDuration) {
        case "daily":
          start = startOfDay;
          end = new Date();
          break;
        case "weekly":
          start = startOfWeek;
          end = new Date();
          break;
        case "monthly":
          start = startOfMonth;
          end = new Date();
          break;
        case "yearly":
          start = startOfYear;
          end = new Date();
          break;
        default:
          start = new Date(0);
          end = new Date();
      }
    }

    const orders = await Order.find({
      orderStatus: { $nin: ["Cancelled", "Returned"] },
      createdAt: { $gte: start, $lte: end },
    }).populate("products.product");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for the specified date range" });
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
        `attachment; filename=${start.toDateString()}-${end.toDateString()}-report.pdf`
      );
      res.send(pdfData);
    });

    const tableTop = 130; // Y coordinate for top of the table
    const tableMargin = 25; // Margin for table content

    doc.fontSize(20).text("TechTrove Sales Report", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Date Range: ${start.toDateString()} - ${end.toDateString()}`, {
        align: "center",
      });
    doc.moveDown();

    // Table headers
    const headers = [
      "SI",
      "Order ID",
      "Products",
      "Price",
      "Order Status",
      "Payment",
      "Total Price",
      "Discount",
    ];
    const columnWidths = [30, 80, 100, 80, 90, 70, 70, 70];
    const tableY = tableTop + tableMargin;

    // Draw headers
    doc.font("Helvetica-Bold").fontSize(11);
    headers.forEach((header, index) => {
      doc.text(
        header,
        tableMargin + sumArray(columnWidths.slice(0, index)),
        tableY,
        { width: columnWidths[index], align: "left" }
      );
    });

    const headerBottomY = tableY + 15; // Adjust height of header
    doc
      .moveTo(tableMargin, headerBottomY)
      .lineTo(tableMargin + sumArray(columnWidths), headerBottomY)
      .stroke();

    // Draw rows
    let currentY = headerBottomY + tableMargin / 2;
    let totalSum = 0;
    let discountSum = 0;
    doc.font("Helvetica").fontSize(8);

    orders.forEach((order, index) => {
      const totalOriginalPrice = order.products.reduce(
        (acc, p) => acc + p.count * p.originalPrice,
        0
      );
      const totalProductsPrice = order.products.reduce(
        (acc, p) => acc + p.count * p.finalPrice,
        0
      );
      const discount = totalOriginalPrice - totalProductsPrice;

      totalSum += totalProductsPrice;
      discountSum += discount;

      const rowData = [
        index + 1, // Serial number
        `#${order.orderId}`,
        order.products.map((p) => `${p.product.title}`).join("\n"),
        order.products.map((p) => `Rs.${p.finalPrice} x ${p.count}`).join("\n"),
        order.orderStatus,
        order.paymentIntent,
        `Rs.${order.totalPrice}`,
        `Rs.${discount}`,
      ];

      rowData.forEach((data, index) => {
        doc.text(
          data,
          tableMargin + sumArray(columnWidths.slice(0, index)),
          currentY,
          { width: columnWidths[index], align: "left" }
        );
      });

      currentY +=
        20 +
        Math.max(
          ...rowData.map((row) => row.toString().split("\n").length - 1)
        ) *
          10;
    });

    doc
      .font("Helvetica-Bold")
      .text(`Total Amount: Rs.${totalSum}`, tableMargin, currentY + 20);
    doc.moveDown();
    doc
      .font("Helvetica-Bold")
      .text(`Discount: Rs.${discountSum}`, tableMargin, currentY + 40);

    doc.end();
  } catch (error) {
    console.error("Error generating PDF report:", error);
    res.status(500).json({ message: "Failed to generate PDF report" });
  }
};

//Get all users
const getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const { name } = req.query;
  
  const limit = 5;
  try {
    const query = { isAdmin: false };
    if (name) {
      query.name = { $regex: name, $options: "i" };
    }
    const count = await User.countDocuments({ isAdmin: false });
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;
    const users = await User.find(query).skip(skip).limit(limit);
    console.log(users);
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
    res.status(200).render("users", { users, pagination });
  } catch (error) {
    throw new Error(error);
  }
};

const updateUserBlockStatus = async (req, res) => {
  const userId = req.params.id;
  const { block } = req.body; // true or false

  try {
    await User.findByIdAndUpdate(userId, { isBlocked: block });
    res.json({
      success: true,
      message: block
        ? "User blocked successfully"
        : "User unblocked successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  loadLoginAdmin,
  loginAdmin,
  loadAdminDashboard,
  getExcelReport,
  getPdfReport,
  getAllUsers,
  updateUserBlockStatus,
};
