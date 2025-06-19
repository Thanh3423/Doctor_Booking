const jwt = require("jsonwebtoken");
const generateToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user._id },
    process.env.JWT_KEY, {
    expiresIn: "30d",
  }); //kya chiz se wo cross check kr sake like email and id
}; //the process.env.JWT_KEY is a way of storing tokens in a .env file which make is like secure

module.exports.generateToken = generateToken;