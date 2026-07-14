const mongoose = require('mongoose');
const { Schema } = mongoose;

const pollSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    question: { type: String, required: true, trim: true, maxlength: 500 },
    code: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Z0-9]{8}$/,
      uppercase: true,
      validate: {
        validator: (v) => /^[A-Z0-9]{8}$/.test(v),
        message: 'Code must be exactly 8 alphanumeric characters',
      },
    },
    answers: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 10,
        message: 'Poll must have between 2 and 10 answers',
      },
    },
    multipleChoices: { type: Boolean, default: false },
    validTill: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

pollSchema.index({ code: 1 });
pollSchema.index({ validTill: 1 });
pollSchema.index({ createdAt: -1 });

pollSchema.pre('save', function (next) {
  const oneDay = 24 * 60 * 60 * 1000;

  if (!this.createdAt) {
    this.createdAt = new Date();
  }

  if (!this.validTill) {
    this.validTill = new Date(this.createdAt.getTime() + oneDay);
  }

  if (!this.expiresAt) {
    this.expiresAt = new Date(this.validTill.getTime() + oneDay);
  }

  this.code = this.code.toUpperCase();
  this.answers = this.answers.map((a) => a.trim()).filter((a) => a.length > 0);

  next();
});

pollSchema.methods.isActive = function () {
  return new Date() < this.validTill;
};

pollSchema.methods.toPublic = function () {
  return {
    id: this._id,
    code: this.code,
    name: this.name,
    question: this.question,
    answers: this.answers,
    multipleChoices: this.multipleChoices,
    validTill: this.validTill,
    expiresAt: this.expiresAt,
    isActive: this.isActive(),
    createdAt: this.createdAt,
  };
};

pollSchema.statics.findByCode = function (code) {
  return this.findOne({ code: code.toUpperCase() });
};

module.exports = mongoose.model('Poll', pollSchema);
