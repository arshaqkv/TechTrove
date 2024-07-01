const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const moment = require('moment')

module.exports = {
    incrementIndex: function (index) {
        return index + 1;
    },
    expiryStatus: function(expiry) {
        const now = new Date();
        const expiryDate = new Date(expiry);
        if (now <= expiryDate) {
        return 'Active';
        } else {
        return 'Expired';
        }
    },
    expiryInDays: function (expiryDate) {
        const now = moment();
        const expiry = moment(expiryDate);
        const daysLeft = expiry.diff(now, 'days');
        return daysLeft;
    },
    formatDate: function(date) {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = new Date(date).toLocaleDateString('en-US', options);
        return formattedDate;
    },
    statusClass: function(status) {
        switch (status) {
          case 'Order Placed': return 'badge-success';
          case 'Processing': return 'badge-warning';
          case 'Dispatched': return 'badge-info';
          case 'Delivered': return 'badge-primary';
          case 'Cancelled': return 'badge-danger';
          case 'Active': return 'badge-success';
          case 'Expired': return 'badge-danger';
          default: return 'badge-secondary';
        }
    },
    eq: function(a, b) {
        return a != b;
    },
    ne: function(a, b) {
        return a != b;
    }
    


};
