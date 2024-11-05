const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value} . :(`;
  return new AppError(message, 400);
};

const handleDublicateFieldsDB = (err) => {
  const message = `Duplicate field value: ${err.keyValue.name}., please enter another value! `;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data : ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const handleInvalidToken = () =>
  new AppError('Invalid Token Please login Again', 401);
const handleExpiredToken = () =>
  new AppError('Expired Token Please login Again', 401);

const sendErrorDiv = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      err: err,
      message: err.message,
      stack: err.stack,
    });
  }
  console.error('ERROR', err);
  return res.status(err.statusCode).render('error', {
    title: 'SomeThing Went Wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    console.error('ERROR', err);
    return res.status(500).json({
      status: 'Error',
      message: 'Something Went Wrong :(',
    });
  }
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'SomeThing Went Wrong!',
      msg: err.message,
    });
  }
  console.error('ERROR', err);
  return res.status(err.statusCode).render('error', {
    title: 'SomeThing Went Wrong!',
    msg: 'Please Try Again Later',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'ERROR';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDiv(err, req, res);
  } else if (process.env.NODE_ENV === 'production ') {
    let error = JSON.parse(JSON.stringify(err));
    error.message = err.message;
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.code === 11000) error = handleDublicateFieldsDB(error);
    if (error.name === 'JsonWebTokenError') error = handleInvalidToken();
    if (error.name === 'TokenExpiredError') error = handleExpiredToken();
    sendErrorProd(error, req, res);
  }
};
