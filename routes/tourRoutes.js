const express = require('express');

const tourController = require(`../controllers/tourController`);
const authController = require(`../controllers/authController`);
const reviewRouter = require('./reviewRoutes');
// const {getAllTours , createNewTour , getTour ,updateTour ,deleteTour} = require('./../controllers/tourController');

const router = express.Router();

router.use('/:tourId/reviews', reviewRouter);
// router.param('id', tourController.checkID);
router
  .route('/top-5-tours')
  .get(tourController.top5tours, tourController.getAllTours);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );
router.route('/tours-stats').get(tourController.getTourStats);
router
  .route('/nearbytours/:distance/center/:latlng/unit/:unit')
  .get(tourController.getNearbyTours);
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
