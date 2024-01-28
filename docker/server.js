const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const app = express();
const port = 3000;

const MAX_RECORDS_PER_ACCOUNT = 1000;
var cache = {}; // For time series plot 
var positionsCache = {}; // For storing the latest position

const users = {
    'emillai': 'Password123!#@' // Example username and password
};

const tokens = {
    'emillai': '1786532a-3950-4624-9cd1-7244e3568ea6'
}

app.use(cors());
// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// POST endpoint to ingest data
app.post('/ingest', (req, res) => {
    console.log('Received data:', req.body);
    var data = req.body;
    if (data.dummy) delete data.dummy;
    var now = new Date();
    var hkTime = new Date(now.getTime());
    var currentTime = hkTime.toISOString();
    data.timestamp = currentTime;
    // Process and store the data
    var account = data.account;
    if (account) {
        if (!cache[account]) {
            cache[account] = [];
        }
        if (data.position) {
            positionsCache[account] = JSON.parse(data.position);
            delete data.position;
        }
        if (cache[account].length >= MAX_RECORDS_PER_ACCOUNT) {
            cache[account].shift(); // Remove the oldest record
        }
        cache[account].push(data); // Add new record
    }
    res.status(200).send('Data received successfully');
});

app.post('/positionIngest', (req, res) => {
    console.log('Received position data:', req.body);
    var data = req.body;
    if (data.dummy) delete data.dummy;
    var now = new Date();
    var hkTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    var currentTime = hkTime.toISOString();
    data.timestamp = currentTime;
    // Process and store the data
    var account = data.account;
    if (account) {
        positionsCache[account] = data;
    }
    res.status(200).send('Position Data received successfully');
});

app.get('/getData', (req, res) => {
    console.log('Query String:', req.query);
    var username = req.query.username;
    var token = req.query.token;
    if (username == undefined || token == undefined) {
        res.status(400).send({ msg: "Wrong Token" });
    }
    if (tokens[username] == token) {
        res.status(200).send({ data: cache });
    } else {
        res.status(400).send({ msg: "Wrong Token" });
    }
});

app.get('/getPosition', (req, res) => {
    let sortedPositionsCache = {};
    var username = req.query.username;
    var token = req.query.token;
    if (username == undefined || token == undefined) {
        res.status(400).send({ msg: "Wrong Token" });
    }
    if (tokens[username] == token) {
        for (let account in positionsCache) {
            if (positionsCache.hasOwnProperty(account)) {
                sortedPositionsCache[account] = positionsCache[account].slice().sort((a, b) => {
                    // Assuming 'volume' is a numeric field
                    return b.volume - a.volume; // For descending order
                });
            }
        }
        res.status(200).send({ data: sortedPositionsCache });
    } else {
        res.status(400).send({ msg: "Wrong Token" });
    }
});

// Login API
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log(req.body);
    if (users[username] && users[username] === password) {
        console.log(`User ${username} logged in successfully`);
        res.status(200).send({
            token: tokens[username],
            app: 'app.html'
        }); // Redirect to index.html on successful login
    } else {
        res.status(401).send('Invalid credentials');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});