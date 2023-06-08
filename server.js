const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const multer = require('multer');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const User = require('./models/User');
const userRoutes = require('./routes/users');
const { Vonage } = require('@vonage/server-sdk');

const OTP = require('./models/OTP');

dotenv.config();

const app = express();
const port = 5000;

const vonage = new Vonage({
  apiKey: "05ef92b7",
  apiSecret: "oy096Nj6ohEc9OOg"
})
// Connect to MongoDB
mongoose.connect('mongodb+srv://Prateek:EjCOPVeGUt3mVxBR@cluster0.ukgaesh.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
  });

  const storage=multer.diskStorage({
    destination:function(req,file,cb){
      return cb(null, "./uploads");
    },
    filename:function(req,file,cb){
      return cb(null, `${Date.now()}-${file.originalname}`);
    }

  })
// Configure multer for image uploads
const upload = multer({storage },
);
app.use(cors());
// Parse JSON body
app.use(express.json());

app.use(bodyParser.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const generateOTP = () => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 4; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};
let otp=generateOTP();

// Signup route
app.post('/signup', upload.single('image'), async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate a unique user ID
    const userId = randomstring.generate(8);

    // Generate a random password
    const password = randomstring.generate(8);
    
    // Create a new user
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobileNumber: req.body.mobileNumber,
      image: req.file.path,
      userId: userId,
      password: password,
      isEmailVerified: false,
      otp: otp,
    });
    await user.save();
const from = "Vonage APIs"
const to = `91${req.body.mobileNumber}`
const text = `A text message sent using the Vonage SMS API ${otp}`

async function sendSMS() {
    await vonage.sms.send({to, from, text})
        .then(resp => { console.log('Message sent successfully'); console.log(resp); })
        .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });
}

    // Save the user
    
    sendSMS();
    // Send verification email
    sendVerificationEmail(user.email, userId, password);
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Error creating user', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify email route
app.get('/verify-email/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find the user by the unique user ID
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark the email as verified
    user.isEmailVerified = true;

    // Save the user
    await user.save();

    res.send('Email verified successfully');
  } catch (err) {
    console.error('Error verifying email', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
      user: 'annette.weissnat51@ethereal.email',
      pass: 'bqA96gMjnNcVrHFmzN'
  }
});

// Send verification email
function sendVerificationEmail(email, userId, password) {
  const verificationLink = `http://localhost:5000/verify-email/${userId}`;

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Email Verification',
    html: `<p>Thank you for signing up! Please click the link below to verify your email:</p><a href="${verificationLink}">${verificationLink}</a><p>Your user ID: ${userId}</p><p>Your password: ${password}</p>
    <p>Your Otp: ${otp}</p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending verification email', error);
    } else {
      console.log('Verification email sent:', info.response);
    }
  });
}


app.post('/login', async(req, res) => {
  // Extract email and password from request body
  try {
    const { email, password,otp } = req.body;

    const user = await User.findOne({ email,password,otp});

   

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // TODO: Compare the password with the hashed password stored in the database

    // If the password matches, the login is successful
    res.json({ message: 'Login successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.use('/users', userRoutes);
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
