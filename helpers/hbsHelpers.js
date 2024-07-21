const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const moment = require('moment')

module.exports = {
    incrementIndex: function (index) {
        return index + 1;
    },
    paginationIndex: function(index, page, limit) {
        return (page - 1) * limit + index + 1;
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
          case 'credit': return 'badge-success';
          case 'debit': return 'badge-danger';
          default: return 'badge-secondary';
        }
    },
    calculateIndex: function(page, limit, index) {
        return (page - 1) * limit + index + 1;
    }, 
    eq: function(a, b) {
        return a.toString() === b.toString();
    },
    ne: function(a, b) {
        return a != b;
    },
    gt: function(a, b) {
        return a > b;
    },
    lt: function(a, b) {
        return a < b;
    },
    and: function(a, b) { 
        return a && b
    },
    or: function(a, b) { 
        return a || b
    },
    add: function(a, b){
        return a + b
    },
    subtract: function(a, b){
        return a - b
    },
    formatDay: function(date) {
        // Implement date formatting as needed
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    },
    ifCond: function (v1, operator, v2, options) {
        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    }
};
