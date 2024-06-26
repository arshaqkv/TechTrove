const express = require('express')
const morgan = require('morgan')
const path = require('path');
require('dotenv').config()
const passport = require('passport');
const session = require('express-session');
const dbConnect = require('./config/dbConnect')
const methodOverride = require('method-override')
const noCache = require('nocache')
const exhbs =require('hbs')
const cookieParser = require('cookie-parser')
const { notFound, errorHandler } = require('./middlewares/errorHandler')
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
    }
}) 

const authRouter = require('./routes/authRoute')
const auth = require('./routes/auth'); 
const productRouter = require('./routes/productRoute')
const categoryRouter = require('./routes/categoryRoute');
const addressRouter = require('./routes/addressRoute')
const coupenRouter = require('./routes/coupenRoute')

hbs.handlebars.registerHelper('ne', function(a, b) {
    return a != b;
});


hbs.handlebars.registerHelper('statusClass', function(status) {
    switch (status) {
      case 'Order Placed': return 'badge-success';
      case 'Processing': return 'badge-warning';
      case 'Dispatched': return 'badge-info';
      case 'Delivered': return 'badge-primary';
      case 'Cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
});

app.use(methodOverride('_method'))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));




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
app.use('/admin', authRouter)
app.use('/user', authRouter)
app.use('/product', productRouter)
app.use('/auth', auth);
app.use('/prod/category', categoryRouter)
app.use('/address', addressRouter)
app.use('/coupen', coupenRouter)

app.use(notFound)
app.use(errorHandler)
app.use(noCache())

const PORT = process.env.PORT || 3000 
app.listen(PORT, ()=>{
    console.log(`Server started at http://localhost:${PORT}`)
    console.log("___________________________")
})