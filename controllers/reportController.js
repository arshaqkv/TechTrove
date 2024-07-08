const asyncHandler = require('express-async-handler')
const Order = require('../models/orderModel')
const validateMongoDbId = require('../utils/validateMongodbID')

const getSalesReport = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalDelivered = await Order.countDocuments({ orderStatus: 'Delivered' });
        const totalCanceled = await Order.countDocuments({ orderStatus: 'Cancelled' });
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' }
                }
            }
        ]);

        res.json({
            totalOrders,
            totalDelivered,
            totalCanceled,
            totalRevenue: totalRevenue[0] ? totalRevenue[0].totalRevenue : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


  

const getPaymentMethodData = async (req, res) => {
    try {
      const paymentData = await Order.aggregate([
        {
          $group: {
            _id: "$paymentIntent",
            count: { $sum: 1 }
          }
        }
      ]);
  
      res.json(paymentData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  module.exports = { getPaymentMethodData,getSalesReport };