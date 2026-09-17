const { Schema, model } = require('mongoose');

const topScreenSchema = new Schema(
  {
    screenName: String,
    visits: Number,
    avgDuration: Number,
  },
  { _id: false }
);

const eventDistSchema = new Schema(
  {
    eventType: String,
    count: Number,
  },
  { _id: false }
);

const analyticsSummarySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    granularity: {
      type: String,
      enum: ['day', 'week', 'month'],
      required: true,
    },
    dau: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 }, // ms
    topScreens: { type: [topScreenSchema], default: [] },
    eventDistribution: { type: [eventDistSchema], default: [] },
    platformBreakdown: {
      ios: { type: Number, default: 0 },
      android: { type: Number, default: 0 },
      web: { type: Number, default: 0 },
    },
    retentionRate: { type: Number, default: 0 }, // %
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

analyticsSummarySchema.index({ granularity: 1, date: -1 });
analyticsSummarySchema.index(
  { granularity: 1, date: 1 },
  { unique: true }
);

module.exports = model('AnalyticsSummary', analyticsSummarySchema);
