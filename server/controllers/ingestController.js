const ingestService = require('../services/ingestService');

const identify = async (req, res, next) => {
  try {
    const user = await ingestService.identifyUser(req.body);
    res.success(user, 200);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await ingestService.trackLogin(req.body);
    res.success(result, 200);
  } catch (err) {
    next(err);
  }
};

const sessionStart = async (req, res, next) => {
  try {
    const session = await ingestService.startSession(req.body);
    res.success(session, 201);
  } catch (err) {
    next(err);
  }
};

const sessionEnd = async (req, res, next) => {
  try {
    const result = await ingestService.endSession(req.body);
    res.success(result);
  } catch (err) {
    next(err);
  }
};

const events = async (req, res, next) => {
  try {
    const result = await ingestService.ingestEvents(req.body.events);
    res.success(result, 201);
  } catch (err) {
    next(err);
  }
};

const screenVisit = async (req, res, next) => {
  try {
    const visit = await ingestService.trackScreenVisit(req.body);
    res.success(visit, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { identify, login, sessionStart, sessionEnd, events, screenVisit };
