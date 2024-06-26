const { Schema, default: mongoose } = require('mongoose')
const bcrypt = require('bcrypt')

let userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true 
    },
    password: {
        type: String,
    },
    phone: {
        type: Number,
    },
    googleId:{
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    defaultAddress: {
        type: Schema.Types.ObjectId,
        ref: "Address"
    },
    cart: {
        type: Schema.Types.ObjectId,
        ref: "Cart"
    },
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "Product"
    }]
    },
    {
        timestamps: true
    }
);
    

userSchema.pre('save', async function(next) {
    const salt = await bcrypt.genSaltSync(10)
    if(this.password){
        this.password = await bcrypt.hash(this.password,salt)
    }
})

userSchema.methods.isPasswordMatched =  async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.model("User", userSchema)
module.exports = User