const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNHANDLED EXCEPTION! SHUTTING DOWN...');
  console.log(err.name, err.message);
  process.exit(1);
});
//
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DB_PASS);

mongoose.connect(DB).then(() => console.log('DB Connection is Successful!'));

const app = require('./app');

const server = app.listen(process.env.PORT, () => {
  console.log(`listening On Port ${process.env.PORT}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! SHUTTING DOWN...');
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
