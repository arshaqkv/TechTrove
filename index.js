const express = require('express')
const morgan = require('morgan')
const path = require('path');
require('dotenv').config()
const passport = require('passport');
const session = require('express-session');
const dbConnect = require('./config/dbConnect')
const methodOverride = require('method-override')
const noCache = require('nocache')
const cookieParser = require('cookie-parser')
const { notFound, errorHandler } = require('./middlewares/errorHandler')
const hbsHelpers = require('./helpers/hbsHelpers');
require('./config/passport')
const app = express()
dbConnect()
const hbs = require('express-handlebars').create({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, '/views/layouts'),
    partialsDir: path.join(__dirname, '/views/partials'),
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    },
    helpers: hbsHelpers
}) 

const authRouter = require('./routes/authRoute')
const auth = require('./routes/auth'); 
const adminRouter = require("./routes/adminRoute")
const productRouter = require('./routes/productRoute')
const categoryRouter = require('./routes/categoryRoute');
const addressRouter = require('./routes/addressRoute')
const couponRouter = require('./routes/couponRoute')
const offerRouter = require('./routes/offerRoute')
const bannerRouter = require('./routes/bannerRoute')

app.use(methodOverride('_method'))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' })); // Adjust the size as needed
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser())

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));


app.use(noCache())

// Set up hbs as the view engine
app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs');
app.set('views', [ 
    path.join(__dirname, 'views'),
    path.join(__dirname, 'views/user'),
    path.join(__dirname, 'views/admin')  
])

// Express session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRouter)
app.use('/admin', adminRouter)
app.use('/product', productRouter)
app.use('/auth', auth);
app.use('/prod/category', categoryRouter)
app.use('/address', addressRouter)
app.use('/coupon', couponRouter)
app.use('/offers', offerRouter)
app.use('/banner', bannerRouter) 

app.use("*", (req, res) => {
  res.status(404).render("404", { title: "404 - Not Found" });
});


app.use(notFound)
app.use(errorHandler)


const PORT = process.env.PORT || 3000 
app.listen(PORT, ()=>{
    console.log(`Server started at http://localhost:${PORT}`)
    console.log("___________________________")
})