const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = function (id) {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production ') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const activeToken = newUser.createEmailActivateToken();
  await newUser.save({ validateBeforeSave: false });

  // const message = `To activate your email please go to the next link\n${activateURL}  .\nIf you didn't sign up, please ignore this e-mail!`;
  const activateURL = `${req.protocol}://${req.get('host')}/api/v1/users/active/${activeToken}`;
  try {
    await new Email(newUser, activateURL).sendWelcome();
    const token = signToken(newUser._id);
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400 * 1000,
      ),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production ') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);
    newUser.password = undefined;
    res.status(200).json({
      status: 'success',
      token,
      data: {
        newUser,
      },
      message: 'a verfiy e-mail has been sent to your account',
    });
  } catch (err) {
    newUser.emailActive = false;
    await newUser.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'there was an error sending the e-mail, plese, Try again later!',
        500,
      ),
    );
  }
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedtoken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    emailActivateToken: hashedtoken,
    emailActivateExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError('The Token is invalid or expired', 400));
  }
  user.emailActive = true;
  user.emailActivateToken = undefined;
  user.emailActivateExpires = undefined;
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please Enter Your Email And Password', 400));
  }
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect E-mail or Password', 401));
  }
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'loggetout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    ///
    return next(new AppError('Please Sign In to access this page..!', 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The User of this token is no longer exist.', 401),
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User Recently changed the password! please log in again.',
        401,
      ),
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

// only for rendered pages, no errors
exports.isLoggedin = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //Logged user
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// eslint-disable-next-line arrow-body-style
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError(
          "You don't have the permission to perform this action. ",
          403,
        ),
      );
    return next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!User) {
    return next(new AppError('There is no User With this Email Address.', 404));
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your Password Reset Token (Only valid for 10 min)',
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordRest();
    res.status(200).json({
      status: 'success',
      message: 'Token Sent to e-mail',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'there was an error sending the e-mail, plese, Try again later!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedtoken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedtoken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError('The Token is invalid or expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError('your Current password is wrong!', 401));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});
