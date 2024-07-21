const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const multerStorage = multer.diskStorage({
    destination: function(req, file, cb) {
       cb(null, ('./public/images/'))
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${file.originalname.slice(0, -4)}`;
        cb(null, file.fieldname + '-' + uniqueSuffix + '.jpeg');
    }
});

const multerFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image')){
        cb(null, true);
    } else {
        cb({
            message: "Unsupported file format"
        }, false);
    }
}

const uploadImg = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: { fieldSize: 2000000 } 
});

const productImgResize = async (req, res, next) => {
    if (!req.files) return next();
    
    const resizedImages = await Promise.all(
        req.files.map(async (file) => {
            const resizedImagePath = path.resolve(`public/images/products/${file.filename}`);
            await sharp(file.path)
             
                .toFormat('jpeg')
                .jpeg({ quality: 100 })
                .toFile(resizedImagePath);

            // Return the new path for the resized image
            return `/images/products/${file.filename}`;
        })
    );
    
    // Add resized image paths to req.body.images
    req.body.images = resizedImages;

    next();
}

module.exports = { uploadImg, productImgResize };
