const { Schema, model } = require('mongoose');

const locationSchema = new Schema(
  {
    country: String,
    city: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: { type: Date },
    duration: { type: Number, default: 0 }, // ms
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'android',
    },
    appVersion: { type: String },
    osVersion: { type: String },
    deviceModel: { type: String },
    networkType: {
      type: String,
      enum: ['wifi', 'cellular', 'offline', 'unknown'],
      default: 'unknown',
    },
    location: locationSchema,
    isActive: { type: Boolean, default: true },
    eventCount: { type: Number, default: 0 },
    screensVisited: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ startTime: -1, platform: 1 });
sessionSchema.index({ isActive: 1, startTime: -1 });

module.exports = model('Session', sessionSchema);
