/**
 * Normalizes the identity of an API-call event.
 *
 * The mobile SDK reports API calls with the full request URL as the event name
 * ("POST /services/apexrest/api/v1/get-kpi-data?range=today&month=8&year=2026"),
 * and repeats it in apiEndpoint. Because every distinct set of query params
 * produced a distinct string, 248k api_call events carried 23,356 unique names
 * averaging 233 bytes — ~100MB of raw URL text, plus ~80MB of index built on top
 * of it, on a 512MB tier. One name was a 1,200-character URL-encoded SOQL query.
 *
 * Dropping the query string collapses those to 2,951 names averaging 59 bytes,
 * which is also what the dashboard actually groups by: nobody wants per-parameter
 * rows, they want "how often is get-kpi-data called".
 *
 * Only the query string goes. Path segments are left intact so distinct endpoints
 * stay distinct, and non-API event names are returned untouched.
 */

// Defensive ceiling for anything that slips through with no query string to trim
// (a very long path, or a name the client built by hand).
const MAX_EVENT_NAME = 200;

const stripQuery = (value) => {
  if (typeof value !== 'string') return value;
  const cut = value.indexOf('?');
  const base = cut === -1 ? value : value.slice(0, cut);
  return base.trim();
};

/**
 * apiEndpoint arrives as an absolute URL while eventName carries "METHOD /path",
 * so the scheme + host has to come off before the two can be compared. The host
 * is the same Salesforce org on every row — it identifies the environment, not
 * the call, and stored per-document it was ~18MB of one repeated string.
 */
const stripOrigin = (value) => {
  if (typeof value !== 'string') return value;
  const marker = value.indexOf('://');
  if (marker === -1) return value;
  const slash = value.indexOf('/', marker + 3);
  return slash === -1 ? '/' : value.slice(slash);
};

const truncate = (value) =>
  typeof value === 'string' && value.length > MAX_EVENT_NAME
    ? `${value.slice(0, MAX_EVENT_NAME - 1)}…`
    : value;

/**
 * Returns the { eventName, apiEndpoint } an event should be stored with.
 * apiEndpoint is dropped when it is redundant with the normalized name — it held
 * the same URL a second time, which was ~53MB of pure duplication.
 */
const normalizeEventIdentity = ({ eventName, apiEndpoint }) => {
  const name = truncate(stripQuery(eventName));
  const endpoint = truncate(stripOrigin(stripQuery(apiEndpoint)));

  if (endpoint && name && (name === endpoint || name.endsWith(` ${endpoint}`))) {
    return { eventName: name, apiEndpoint: undefined };
  }
  return { eventName: name, apiEndpoint: endpoint };
};

module.exports = { normalizeEventIdentity, stripQuery, stripOrigin, MAX_EVENT_NAME };
