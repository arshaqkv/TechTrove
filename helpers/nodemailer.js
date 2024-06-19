const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    requireTLS: true,
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
                return res.render('signup', { error: 'Failed to send OTP. Try again.' });
            }else {
                console.log("Email has been send to " + info.response)
            }
        })
    } catch (error) {
        throw new Error(error)
    }
}


module.exports = { sendVerificationMail }