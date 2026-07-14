const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    selected: {
      type: [Number],
      required: true,
      validate: {
        validator: function (arr) {
          return (
            arr.length > 0 &&
            arr.every((index) => index >= 0) &&
            arr.length === new Set(arr).size
          );
        },
        message: 'Selected must contain unique, non-negative indices',
      },
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

voteSchema.index({ pollId: 1, deviceId: 1 }, { unique: true });

voteSchema.methods.toPublic = function () {
  return {
    pollId: this.pollId,
    deviceId: this.deviceId,
    selected: this.selected,
    votedAt: this.votedAt,
  };
};

const Vote = mongoose.model('Vote', voteSchema);
module.exports = Vote;
