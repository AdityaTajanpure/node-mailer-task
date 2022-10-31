const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const nodemailer = require("nodemailer");
const auth = require("../../middlewares/jwt_verifier");

//* @route  POST /login
//* @desc   Login user
//* @access Public
router.post(
  "/login",
  [
    check("email", "Please include a valid email address").isEmail(),
    check("password", "Password should be atleast 6 characters long").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          status: false,
          errors: [{ msg: "Invalid Credentials" }],
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          status: false,
          errors: [{ msg: "Invalid Credentials" }],
        });
      }

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
        (err, authKey) => {
          if (err) throw err;
          res.json({ status: true, authKey });
        }
      );
    } catch (error) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

//* @route  POST /signup
//* @desc   Register user
//* @access Public
router.post(
  "/signup",
  [
    check("name", "Name is required").exists(),
    check("email", "Please include a valid email address").isEmail(),
    check("password", "Password should be atleast 6 characters long").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          status: false,
          errors: [{ msg: "User with same email already exists" }],
        });
      }

      user = new User({ name, email, password });
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
        (err, authKey) => {
          if (err) throw err;
          res.json({ status: true, message: "User registered!", authKey });
        }
      );
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  }
);

//* @route  POST /forgetPassword
//* @desc   Send temp login password to user email
//* @access Public
router.post(
  "/forgetPassword",
  [check("email", "Email is required").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        errors: errors.array(),
      });
    }
    const { email } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          status: false,
          errors: [{ msg: "User not found" }],
        });
      }

      const generatePassword = () => {
        var length = 8,
          charset =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
          retVal = "";
        for (var i = 0, n = charset.length; i < length; ++i) {
          retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
      };

      const newPassword = generatePassword();
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      const authObject = {
        service: "Gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      };
      let transporter = nodemailer.createTransport(authObject);
      let mailOptions = {
        from: process.env.MAIL_USER,
        to: email,
        subject: "Password reset successfully",
        text: `Hi ${
          email.split("@")[0]
        },\n\nYour password is successfully reset..\n\nKindly use this as your new password: ${newPassword}\n\nThanks! – Aditya
        \n
        `,
      };
      transporter.sendMail(mailOptions, function (err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Email sent successfully");
        }
      });
      //We can also send an link to reset password, than directly resetting the password
      //We'll keep current code for demo purpose
      res.json({
        status: true,
        msg: "Password reset successfully",
      });
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  }
);

//* @route  POST /mailSend
//* @desc   Send mail
//* @access Private
router.post(
  "/sendMail",
  [
    auth,
    check(
      "receiver_email",
      "Receiver email is not a valid email address"
    ).isEmail(),
    check("subject", "Mail subject is required").exists(),
    check("content", "Mail content is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(401).json({
        status: false,
        errors: errors.array(),
      });
    }

    const { receiver_email, subject, content } = req.body;

    try {
      const user = await User.findById(req.user.id);
      const authObject = {
        service: "Gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      };
      let transporter = nodemailer.createTransport(authObject);
      let mailOptions = {
        from: process.env.MAIL_USER,
        to: receiver_email,
        subject: subject,
        text: `${content}\nSent by ${user.name} - ${user.email}`,
      };
      transporter.sendMail(mailOptions, function (err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Email sent successfully");
        }
      });
      res.json({
        status: true,
        msg: "Email sent successfully",
      });
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
