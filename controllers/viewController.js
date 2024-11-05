const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Booking = require('../models/bookingModel');

exports.overview = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();
  res
    .status(200)
    .set('Content-Security-Policy', "frame-src 'self'")
    .render('overview', {
      title: 'All Tours',
      tours,
    });
});
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  res
    .status(200)
    .set('Content-Security-Policy', "frame-src 'self'")
    .render('tour', {
      title: `${tour.name} Tour`,
      tour,
    });
});
exports.getLoginForm = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .set('Content-Security-Policy', "frame-src 'self'")
    .render('login', {
      title: `Log into your account`,
    });
});

exports.getAccount = (req, res) => {
  res
    .status(200)
    .set('Content-Security-Policy', "frame-src 'self'")
    .render('account', {
      title: `Your Account`,
    });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
