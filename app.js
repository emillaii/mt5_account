const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const app = express();
const port = 3000;

const MAX_RECORDS_PER_ACCOUNT = 1000;
var cache = {}; // For time series plot 
var positionsCache = {}; // For storing the latest position 

app.use(cors());
// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

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
    res.status(200).send({ data: cache });
});

app.get('/getPosition', (req, res) => {
    let sortedPositionsCache = {};

    for (let account in positionsCache) {
        if (positionsCache.hasOwnProperty(account)) {
            sortedPositionsCache[account] = positionsCache[account].slice().sort((a, b) => {
                // Assuming 'volume' is a numeric field
                return b.volume - a.volume; // For descending order
            });
        }
    }

    res.status(200).send({ data: sortedPositionsCache });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});