const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  //Headers are preferably used
  const token = req.body.authKey;

  if (!token) {
    return res.status(401).json({
      msg: "unauthorized",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: "unauthorized" });
  }
};
