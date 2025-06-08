const multer = require('multer');
const cloudinary = require("cloudinary").v2
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = multer.memoryStorage()
const uploadMiltpleImages = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).array('image', 2); // Maximum 2 images

const uploadImage = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('image');

module.exports.uploadImage = async (file) => {
    try {

        // Upload img to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream((error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            })
            stream.end(file.buffer);
        })
        return {
            url: result.secure_url,
            publicId: result.public_id,
        }

    } catch (error) {
        console.error(error);
        throw new Error("Internal Server Error: Failed to upload image to Cloudinary");
    }
};

module.exports.uploadImages = async (files) => {
    try {

        // Upload imgs to Cloudinary
        const imgs = [];
        for (let file of files) {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                })
                stream.end(file.buffer);
            })
            imgs.push({
                url: result.secure_url,
                publicId: result.public_id,
            });
        }

        return imgs

    } catch (error) {
        console.error(error);
        throw new Error("Internal Server Error: Failed to upload images to Cloudinary");
    }
};

module.exports.deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId)

        return result;

    } catch (error) {
        throw new Error("Internal Server Error: Cloudinary");
    }
};

module.exports.deleteImages = async (publicIds) => {

    try {
        const result = await cloudinary.api.delete_resources(publicIds)

        return result;

    } catch (error) {
        console.log(error)
        throw new Error("Internal Server Error: Cloudinary");
    }
};

module.exports.handleUploadMultipleImges = uploadMiltpleImages;
module.exports.handleUploadImage = uploadImage;