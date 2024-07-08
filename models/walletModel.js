const { Schema, default:mongoose} = require('mongoose')

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    balance: {
        type: Number,
        default: 0.0,
        min: 0,
    },
    transactions: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        },
    ],
});
      
const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet; 