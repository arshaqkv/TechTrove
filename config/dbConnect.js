const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const dbConnect = () =>{
    try{
        mongoose.connect(process.env.MONGO_URL);
        console.log("Database connection successfull");
    }catch(error){
        console.log("Database connection error",error.message);
    }
}
 
module.exports = dbConnect; 