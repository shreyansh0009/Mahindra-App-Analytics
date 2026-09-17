/**
 * Dealership details attached to a user profile.
 *
 * The app's user profile carries the Salesforce *account* the user belongs to —
 * the dealership — and that account's billing address. That address is the only
 * real geography in the system: it locates the dealership, not the user, so
 * "users in West Bengal" means "users attached to a dealership billed in West
 * Bengal". Report it that way and the numbers are defensible; call it user
 * location and they are not.
 *
 * AO and TM genuinely do not exist in this data and are not modelled.
 *
 * Deliberately NOT enum-validated. `designation` is enum-checked so app-side
 * role drift surfaces immediately, but that only works because the role ladder
 * is a closed list we hold in full. Dealer names, cities and categories are open
 * sets read from Salesforce records — enumerating them from one sample payload
 * would reject valid production data on arrival.
 */

// Only accounts of this category count as dealerships. The app sends '' for
// every other account type, and the client asked for dealer-only geography, so
// a blank category must not reach the geographic rollups.
const DEALER_CATEGORY = 'DEALER';

// Salesforce sends these SHOUTED ("WEST BENGAL", "BURDWAN"). Casing varies
// across records, and raw values would split one place into several filter
// entries, so fold to a single display form at write time — the filter lists are
// built with $distinct over stored values, so normalising on the way in is what
// keeps them clean.
const titleCase = (value) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[a-z]/, (c) => c.toUpperCase()))
    .join(' ');

const clean = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed || undefined;
};

const cleanPlace = (value) => {
  const c = clean(value);
  return c && titleCase(c);
};

/**
 * Reads the dealership out of an identify payload, accepting all three shapes
 * the field names arrive in: the app's flat camelCase keys (`accountName`,
 * `billingState`), a nested `dealer` object, and the raw Salesforce keys
 * (`account_name`, `billing_state`). The app already holds the profile object,
 * so tolerating its own names removes a mapping step — and a mapping step is a
 * place to introduce a bug.
 */
const normalizeDealer = (payload) => {
  if (!payload || typeof payload !== 'object') return undefined;
  const nested = payload.dealer && typeof payload.dealer === 'object' ? payload.dealer : {};

  /**
   * Bare keys — `name`, `state`, `city` — are only read from a nested `dealer`
   * object. At the top level of an identify payload `name` is the *user's* name,
   * and reading it here filed every user's own name as their dealership. The
   * qualified keys (`accountName`, `billingState`, …) are unambiguous and are
   * accepted from either level.
   */
  const bare = (name) => clean(nested[name]);
  const qualified = (...names) => {
    for (const n of names) {
      const v = clean(nested[n]) ?? clean(payload[n]);
      if (v !== undefined) return v;
    }
    return undefined;
  };
  const place = (value) => value && titleCase(value);

  const dealer = {
    accountId: qualified('accountId', 'account_id'),
    name: bare('name') ?? qualified('accountName', 'account_name'),
    category: (bare('category') ?? qualified('dealerCategory', 'DealerCategory__c'))?.toUpperCase(),
    state: place(bare('state') ?? qualified('billingState', 'billing_state')),
    city: place(bare('city') ?? qualified('billingCity', 'billing_city')),
    postalCode: bare('postalCode') ?? qualified('billingPostalCode', 'billing_postal_code'),
    street: bare('street') ?? qualified('billingStreet', 'billing_street'),
    country: place(bare('country') ?? qualified('billingCountry', 'billing_country')),
  };

  /**
   * Stable grouping key. The app does not currently send `account_id`, so every
   * rollup would otherwise have to group by dealer name — which merges two
   * dealerships that share a name and splits one that gets renamed. Resolving
   * the key once at write time keeps the aggregations on a single field, so
   * adding account_id later needs no query changes.
   */
  dealer.key = dealer.accountId || dealer.name;

  // Drop absent keys so an $set never overwrites a stored value with undefined.
  const present = Object.entries(dealer).filter(([, v]) => v !== undefined);
  return present.length ? Object.fromEntries(present) : undefined;
};

// Mongo match for the dealership dimensions a report can be sliced by. Mirrors
// buildRoleMatch in roleTaxonomy.js; the two are combined by the services.
const buildDealerMatch = (query = {}) => {
  const match = {};
  if (query.dealerId) match['dealer.key'] = query.dealerId;
  if (query.dealerCategory) match['dealer.category'] = query.dealerCategory;
  if (query.state) match['dealer.state'] = query.state;
  if (query.city) match['dealer.city'] = query.city;
  return match;
};

module.exports = { normalizeDealer, buildDealerMatch, titleCase, DEALER_CATEGORY };
