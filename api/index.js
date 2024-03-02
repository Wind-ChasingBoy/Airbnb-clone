const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// const { MongoClient } = require("mongodb");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Place = require('./models/Place');
const Booking = require('./models/Booking');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader')
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { json } = require('express');
const { body, validationResult } = require('express-validator');
const logger = require('./logger.js');
const helmet = require('helmet');
require('dotenv').config()

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
// const jwtSecret = 'fnqeiorhfsdnfmvdnjdiaiuefsidfnksajfn';
// retrieve jwtSecret from environment variables.
const jwtSecret = process.env.JWT_SECRET || 'fnqeiorhfsdnfmvdnjdiaiuefsidfnksajfn';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            // other strategies can be added……
        }
    }
}));
app.use(express.json());
app.use(cookieParser());
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send('Something went wrong!');
});// log errors
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));

mongoose.connect(process.env.MONGO_URL);
// const client = new MongoClient(process.env.MONGO_URL);
// client.connect();

app.get('/test', (req, res) => {
    logger.info('Test endpoint called.');
    res.json('test ok');
});

app.post('/register',[
    // Validate name
    body('name').notEmpty().isString(),

    // Validate email
    body('email').notEmpty().isEmail(),

    // Validate password
    body('password').notEmpty().isString(),
], async (req, res) => {
    logger.info('Register endpoint called.');
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
        });
        res.json(userDoc);
    } catch (e) {
        res.status(422).json(e);
    }
});

app.post('/login', async (req, res) => {
    logger.info('Login endpoint called.');
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email })
    if (userDoc) {
        const passOK = bcrypt.compareSync(password, userDoc.password)
        if (passOK) {
            jwt.sign({ email: userDoc.email, id: userDoc._id }, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json(userDoc);
            });
        } else {
            res.status(422).json('pass not ok');
        }
    } else {
        res.json('not found');
    }
});

app.get('/profile', (req, res) => {
    logger.info('Profile endpoint called.');
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            const { name, email, _id } = await User.findById(userData.id);
            res.json({ name, email, _id });
        })
    } else {
        res.json(null);
    }
});

app.post('/logout', (req, res) => {
    logger.info('Logout endpoint called.');
    res.cookie('token', '').json(true);
})

app.post('/upload-by-link', async (req, res) => {
    logger.info('Upload-by-link endpoint called.');
    const { link } = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image({
        url: link,
        dest: __dirname + '/uploads/' + newName,
    });
    res.json(newName);
})

const photosMiddleware = multer({ dest: 'uploads' });
app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
    logger.info('Upload endpoint called.');
    const uploadFiles = [];
    for (let i = 0; i < req.files.length; i++) {
        const { path, originalname } = req.files[i];
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
        uploadFiles.push(newPath.replace('uploads/', ''));
    }
    res.json(uploadFiles);
});

app.post('/places', (req, res) => {
    logger.info('Places endpoint called.');
    const { token } = req.cookies;
    const { title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests, price } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.create({
            owner: userData.id, price,
            title, address, photos: addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests,
        });
        res.json(placeDoc);
    });
});

app.get('/user-places', (req, res) => {
    logger.info('User-places endpoint called.');
    const { token } = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        const { id } = userData;
        res.json(await Place.find({ owner: id }));
    });
})

app.get('/places/:id', async (req, res) => {
    logger.info('Places:id endpoint called.');
    const { id } = req.params;
    res.json(await Place.findById(id));
})

app.put('/places', async (req, res) => {
    logger.info('Put places endpoint called.');
    const { token } = req.cookies;
    const { id, title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests, price } = req.body;
    const placeDoc = await Place.findById(id);
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
                title, address, photos: addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests, price,
            });
            await placeDoc.save();
            res.json('ok');
        }
    });
});

app.get('/places', async (req, res) => {
    logger.info('Get places endpoint called.');
    res.json(await Place.find());
})

app.post('/bookings', async (req, res) => {
    logger.info('Post bookings endpoint called.');
    const userData = await getUserDataFromReq(req);
    const { place, checkIn, checkOut, numberOfGuests, name, phone, price } = req.body;
    Booking.create({
        place, checkIn, checkOut, numberOfGuests, name, phone, price,
        user: userData.id,
    }).then((doc) => {
        res.json(doc);
    }).catch((err) => {
        throw err;
    });
});

function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            resolve(userData);
        });
    });

}

app.get('/bookings', async (req, res) => {
    logger.info('Get bookings endpoint called.');
    const userData = await getUserDataFromReq(req);
    res.json(await Booking.find({ user: userData.id }).populate('place'));
})

app.listen(4000);

