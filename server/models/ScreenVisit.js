const { Schema, model } = require('mongoose');

const screenVisitSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    screenName: {
      type: String,
      required: true,
    },
    entryTime: {
      type: Date,
      required: true,
    },
    exitTime: { type: Date },
    duration: { type: Number, default: 0 }, // ms
    date: {
      type: Date,
      required: true,
      index: true, // date-only for daily aggregations (midnight UTC)
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

screenVisitSchema.index({ screenName: 1, date: -1 });
screenVisitSchema.index({ userId: 1, date: -1 });
screenVisitSchema.index({ sessionId: 1, entryTime: 1 });

module.exports = model('ScreenVisit', screenVisitSchema);
