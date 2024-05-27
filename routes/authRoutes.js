const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authKeys = require("../lib/authKeys");
const bcrypt = require('bcrypt');

const User = require("../db/User");
const JobApplicant = require("../db/JobApplicant");
const Recruiter = require("../db/Recruiter");

const router = express.Router();
const nodemailer = require('nodemailer');

// Route to handle forgot password request
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate random token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Update user document with the reset token and expiration time
    
    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000; // Token expires in 1 hour
    await user.save();

    // Send reset password email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: 'devchoudharyias32@gmail.com',
          pass: 'mgot znjj bgco oyib'
      }
  });

    const mailOptions = {
      from: 'devchoudharyias32@gmail.com',
      to: email,
      subject: 'Password Reset Request',
      html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
             <p>Please click on the following link to reset your password:</p>
             <p><a href="https://effortless-basbousa-ef1bb9.netlify.app/reset-password/${token}">Reset Password Link</a></p>`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset password email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/resetpassword', async (req, res) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update user password and clear reset token fields
    // user.password = await bcrypt.hash(password, 10);
    user.password=password;
    
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post("/signup", async (req, res) => {
  const data = req.body;
  const verificationToken = jwt.sign({ email: data.email }, authKeys.jwtSecretKey, { expiresIn: '1d' });

  let user = new User({
    email: data.email,
    password: data.password,
    type: data.type,
    verificationToken,
  });

  try {
    await user.save();

    const userDetails =
      user.type == "recruiter"
        ? new Recruiter({
            userId: user._id,
            name: data.name,
            contactNumber: data.contactNumber,
            bio: data.bio,
          })
        : new JobApplicant({
            userId: user._id,
            name: data.name,
            education: data.education,
            skills: data.skills,
            rating: data.rating,
            resume: data.resume,
            profile: data.profile,
          });

    await userDetails.save();
     const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: 'devchoudharyias32@gmail.com',
          pass: 'mgot znjj bgco oyib'
      }
    });

    const mailOptions = {
      from: 'devchoudharyias32@gmail.com',
      to: data.email,
      subject: 'Email Verification',
      html: `<p>Please verify your email by clicking on the following link:</p>
             <p><a href="https://effortless-basbousa-ef1bb9.netlify.app/verify-email/${verificationToken}">Verify Email</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Signup successful. Please check your email to verify your account.' });
  } catch (err) {
    res.status(400).json(err);
  }
});
// router.post("/signup", (req, res) => {
//   const data = req.body;
//   let user = new User({
//     email: data.email,
//     password: data.password,
//     type: data.type,
//   });

//   user
//     .save()
//     .then(() => {
//       const userDetails =
//         user.type == "recruiter"
//           ? new Recruiter({
//               userId: user._id,
//               name: data.name,
//               contactNumber: data.contactNumber,
//               bio: data.bio,
//             })
//           : new JobApplicant({
//               userId: user._id,
//               name: data.name,
//               education: data.education,
//               skills: data.skills,
//               rating: data.rating,
//               resume: data.resume,
//               profile: data.profile,
//             });

//       userDetails
//         .save()
//         .then(() => {
//           // Token
//           const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
//           res.json({
//             token: token,
//             type: user.type,
//           });
//         })
//         .catch((err) => {
//           user
//             .delete()
//             .then(() => {
//               res.status(400).json(err);
//             })
//             .catch((err) => {
//               res.json({ error: err });
//             });
//           err;
//         });
//     })
//     .catch((err) => {
//       res.status(400).json(err);
//     });
// });
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, authKeys.jwtSecretKey);

    const user = await User.findOne({ email: decoded.email, verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// router.post("/login", (req, res, next) => {
//   passport.authenticate(
//     "local",
//     { session: false },
//     function (err, user, info) {
//       if (err) {
//         return next(err);
//       }
//       if (!user) {
//         res.status(401).json(info);
//         return;
//       }
//       // Token
//       const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
//       res.json({
//         token: token,
//         type: user.type,
//       });
//     }
//   )(req, res, next);
// });
router.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json(info);
    }
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in.' });
    }

    const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
    res.json({
      token: token,
      type: user.type,
    });
  })(req, res, next);
});


module.exports = router;
