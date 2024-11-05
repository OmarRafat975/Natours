const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router
  .route('/')
  .get(
    bookingController.createBookingCheckout,
    authController.isLoggedin,
    viewController.overview,
  );
router
  .route('/tour/:slug')
  .get(authController.isLoggedin, viewController.getTour);
router
  .route('/login')
  .get(authController.isLoggedin, viewController.getLoginForm);
router.route('/me').get(authController.protect, viewController.getAccount);
router
  .route('/my-tours')
  .get(authController.protect, viewController.getMyTours);

module.exports = router;
