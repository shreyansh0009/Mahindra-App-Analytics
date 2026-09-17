const { Schema, model } = require('mongoose');

const EVENT_TYPES = [
  'app_open',
  'app_close',
  'login',
  'logout',
  'screen_view',
  'screen_exit',
  'button_click',
  'navigation',
  'api_call',
  'error',
  'crash',
  'app_startup',
  'custom',
  // Feature-usage tracking (Enquiry lifecycle, Product Guide, Village Visit,
  // Booking/Delivery) — powers featureUsageService's real-data aggregation.
  'enquiry_creation',
  'enquiry_review',
  'enquiry_followup',
  'product_guide',
  'village_visit',
  'booking',
  'delivery',
];

// Performance timings (ms) captured with perf-related events.
// screen_view → loadTimeMs, app_startup → startupTimeMs, api_call → responseTimeMs.
const metricsSchema = new Schema(
  {
    loadTimeMs: Number,
    startupTimeMs: Number,
    responseTimeMs: Number,
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    screenName: { type: String },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    properties: { type: Schema.Types.Mixed, default: {} },
    duration: { type: Number }, // ms — meaningful for screen_view / api_call
    errorMessage: { type: String },   // for eventType === 'error'
    apiEndpoint: { type: String },    // for eventType === 'api_call'
    statusCode: { type: Number },     // for eventType === 'api_call'
    metrics: { type: metricsSchema }, // perf timings for crash/app_startup/api_call/screen_view
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

eventSchema.index({ userId: 1, timestamp: -1 });
eventSchema.index({ sessionId: 1, timestamp: 1 });
eventSchema.index({ eventType: 1, timestamp: -1 });
eventSchema.index({ screenName: 1, timestamp: -1 });
eventSchema.index({ eventName: 1, timestamp: -1 });

module.exports = model('Event', eventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
