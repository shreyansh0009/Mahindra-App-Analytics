const { Schema, model } = require('mongoose');
const { ROLES } = require('../data/roleTaxonomy');

const userSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'android',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    ageGroup: {
      type: String,
      enum: ['18-24', '25-34', '35-44', '45-54', '55+'],
      default: '25-34',
    },
    country: { type: String, default: 'India' },
    firstSeenAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now, index: true },
    totalSessions: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    totalScreenViews: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 }, // ms
    isActive: { type: Boolean, default: true, index: true },

    // ── Organisation ────────────────────────────────────────────────────
    // Role is the only organisational dimension the app reports. The former
    // zone/state/ao/dealer/branch/tm hierarchy was removed: the app has no such
    // data to send, so those fields only ever held seeded values. See
    // server/data/roleTaxonomy.js.
    // No single-field index here: { designation, lastActiveAt } below covers
    // designation-only queries as its prefix.
    designation: { type: String, enum: ROLES },
    mobile: { type: String, trim: true },
    doj: { type: Date }, // date of joining
    starId: { type: String, trim: true },

    // ── Dealership ──────────────────────────────────────────────────────
    // The Salesforce account the user belongs to, plus that account's billing
    // address. This is the only real geography available: it locates the
    // dealership, not the user. Denormalised onto the user (rather than a
    // dealers collection) to match how role analytics already aggregate —
    // every report groups users, so the join would be on every query.
    // Not enum-validated: dealer names and cities are open sets from
    // Salesforce. See server/data/dealerTaxonomy.js.
    dealer: {
      accountId: { type: String, trim: true },
      // Resolved once at write time as accountId || name, so every rollup groups
      // on a single field. The app does not send account_id yet; grouping by
      // name alone would merge same-named dealerships and split renamed ones.
      key: { type: String, trim: true },
      name: { type: String, trim: true },
      category: { type: String, trim: true, uppercase: true },
      state: { type: String, trim: true },
      city: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      street: { type: String, trim: true },
      country: { type: String, trim: true },
    },

    // ── Login activity (drives user classification) ────────────────────
    loginDays: { type: Number, default: 0, index: true }, // distinct calendar days with a login
    totalLogins: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ lastActiveAt: -1 });
userSchema.index({ platform: 1, isActive: 1 });
userSchema.index({ designation: 1, lastActiveAt: -1 });

// Dealer reports group by accountId and filter by state/city. The state index
// leads with state so it also covers state-only queries as a prefix.
userSchema.index({ 'dealer.key': 1, lastActiveAt: -1 });
// Leads with category because the dealer/geography reports scope to
// category = DEALER before anything else.
userSchema.index({ 'dealer.category': 1, 'dealer.state': 1, 'dealer.city': 1 });

module.exports = model('User', userSchema);
