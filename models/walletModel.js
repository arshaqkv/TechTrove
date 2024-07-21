  const { Schema, default:mongoose} = require('mongoose')

  const walletSchema = new Schema({
      userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
      },
      amount: {
          type: Number,
          required: true
      },
      type: {
          type: String,
          enum: ['credit', 'debit'],
          required: true
      },
      orderId: {
          type: Schema.Types.ObjectId,
          ref: 'Order'
      },
      createdAt: {
          type: Date,
          default: Date.now
      }
  });
        
  const Wallet = mongoose.model("Wallet", walletSchema);

  module.exports = Wallet; 