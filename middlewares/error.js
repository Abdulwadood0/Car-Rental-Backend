//Not found error handler
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Handle Multer errors
    if (err.code === 'LIMIT_FILE_COUNT') {
        statusCode = 400;
        message = 'You can upload a maximum of 2 images';
    } else if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File size too large. Maximum size is 5MB';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message = 'Unexpected field name for file upload';
    } else if (err.name === 'MulterError') {
        // Catch any other Multer errors
        statusCode = 400;
        message = `File upload error: ${err.message}`;
    }

    res.status(statusCode).json({
        message: message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
}

module.exports = { errorHandler, notFound };