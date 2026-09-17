const authService = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const data = await authService.login(username, password);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const data = await authService.getMe(req.admin.id);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

// Stateless JWT — client discards the token. Endpoint exists for symmetry.
const logout = async (req, res, next) => {
  try {
    res.success({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, me, logout };
