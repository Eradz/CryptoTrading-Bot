export const errorHandler = (err, req, res, next) => {
    const errorMessage = err.message
    const stack = err.stack
    const statusCode = res.statusCode? res.statusCode : 500
    res.status(statusCode).json({ message: errorMessage, stack: process.env.NODE_ENV === "development" ? stack :{} })
}