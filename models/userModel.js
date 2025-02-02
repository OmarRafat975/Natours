const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please Tell Us your name'] },
  email: {
    type: String,
    required: [true, 'Please Provide Your e-mail'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please Provide A valid E-mail'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please Provide a password '],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please Confirm Your Password'],
    validate: {
      // THIS ONLY WORKS ON Create & SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords Are not The same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailActivateToken: String,
  emailActivateExpires: Date,
  emailActive: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimeStamp;
  }
  return false;
};
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
userSchema.methods.createEmailActivateToken = function () {
  const activateToken = crypto.randomBytes(32).toString('hex');
  this.emailActivateToken = crypto
    .createHash('sha256')
    .update(activateToken)
    .digest('hex');

  this.emailActivateExpires = Date.now() + 60 * 60 * 1000;

  return activateToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
