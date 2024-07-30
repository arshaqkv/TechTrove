const asyncHandler = require('express-async-handler')
const validateMongoDbId = require('../utils/validateMongodbID')
const Banner = require('../models/bannerModel')
const fs = require('fs');
const path = require('path');

const loadCrateBanner = asyncHandler(async (req, res) =>{
    try{
        res.render('createBanner')
    }catch(error){
        console.log(error)
    }
})

const createBanner = asyncHandler(async (req, res) => {
    try {
        const { title, image } = req.body;

        // Check if image is provided
        if (!image) {
            return res.status(400).json({ success: false, message: 'Image is required' });
        }

        // Decode base64 image
        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ success: false, message: 'Invalid image format' });
        }

        const imageBuffer = Buffer.from(matches[2], 'base64');
        const imageType = matches[1].split('/')[1];
        
        // Extract original filename from the data URL or generate a unique name
        const originalName = matches[0].split('name=')[1] || `${Date.now()}.${imageType}`;
        const imageName = originalName.replace(/\s+/g, '-'); // Replace spaces with hyphens
        const imagePath = path.join('./public/images', 'banners', imageName);

        // Ensure the banners directory exists
        fs.mkdirSync(path.join('./public/images', 'banners'), { recursive: true });

        // Save the image to the server
        fs.writeFileSync(imagePath, imageBuffer);

        // Save the image path to the database
        const banner = await Banner.create({
            title,
            image: `/images/banners/${imageName}`
        });

        res.status(201).json({ success: true, data: banner });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

const banners = asyncHandler(async (req, res) =>{
    try {
        const banners = await Banner.find({})
        res.render('allBanners', { banners })
    } catch (error) {
        console.log(error)
    }
})

const deleteBanner = asyncHandler(async (req, res) =>{
    const { id } = req.params
    try {
        const banner = await Banner.findByIdAndDelete(id)
        res.status(201).json({ success: true, message: 'Banner removed successfully' })
    } catch (error) {
        console.log(error)
    }
})

module.exports = {
    loadCrateBanner,
    createBanner,
    banners,
    deleteBanner
}