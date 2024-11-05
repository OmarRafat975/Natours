const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./models/tourModel');
const User = require('./models/userModel');
const Review = require('./models/reviewModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DB_PASS);

mongoose.connect(DB).then(() => console.log('DB Connection is Successful!'));

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours.json`, 'utf-8'),
);
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/users.json`, 'utf-8'),
);

const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/reviews.json`, 'utf-8'),
);

const importData = async () => {
  try {
    await Tour.create(tours, { validateBeforeSave: false });
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews, { validateBeforeSave: false });
    console.log('Data imported Successfuly');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data removed Successfuly');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
