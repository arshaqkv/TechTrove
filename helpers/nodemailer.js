const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, 
    auth: {
        user: process.env.USER,
        pass: process.env.PASS
    }
})  

//send verification mail
const sendVerificationMail = async (email, subject, content) =>{
    try {
        const mailOptions = {
            from: process.env.USER,
            to: email, 
            subject: subject,
            html: content
        }
        transporter.sendMail(mailOptions, (error,info) =>{
            if(error){  
                console.log('Failed to send OTP. Try again.', error)
            }else {
                console.log("Email has been send to " + info.response)
            }
        })
    } catch (error) {
        throw new Error(error)
    }
}


module.exports = { sendVerificationMail }