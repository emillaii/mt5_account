const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4, stringify } = require('uuid');
const cors = require("cors");
const app = express();
const port = 3000;

const MAX_RECORDS_PER_ACCOUNT = 3000;
var cache = {}; // For time series plot 
var positionsCache = {}; // For storing the latest position
var dealsCache = {}; // For storing the deal position
var allDealsCache = {}; // For storing the deal position requested by client
var commandCache = {}; // For storing the command send to MT5 account

const { users, tokens } = require('./config');
const { COMMAND_STATUS_COMPLETED, COMMAND_STATUS_PENDING } = require('./constants');

app.use(cors());
// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// POST endpoint to ingest data
app.post('/ingest', (req, res) => {
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
        if (data.deals) {
            dealsCache[account] = JSON.parse(data.deals);
            delete data.deals;
        }
        if (cache[account].length >= MAX_RECORDS_PER_ACCOUNT) {
            cache[account].shift(); // Remove the oldest record
        }
        cache[account].push(data); // Add new record
    }
    res.status(200).send('Data received successfully');
});

app.post('/positionIngest', (req, res) => {
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
    // Check if username or token is null, undefined, or empty
    if (!username || !token) {
        return res.status(400).send({ msg: "Username or token missing" });
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

    // Check if username or token is null, undefined, or empty
    if (!username || !token) {
        return res.status(400).send({ msg: "Username or token missing" });
    }

    // Proceed if token matches
    if (tokens[username] === token) {
        for (let account in positionsCache) {
            if (positionsCache.hasOwnProperty(account)) {
                sortedPositionsCache[account] = positionsCache[account].slice().sort((a, b) => {
                    return b.volume - a.volume; // For descending order
                });
            }
        }
        res.status(200).send({ data: sortedPositionsCache });
    } else {
        res.status(400).send({ msg: "Wrong Token" });
    }
});

app.get('/getDeals', (req, res) => {
    let sortedDealsCache = {};
    var username = req.query.username;
    var token = req.query.token;

    // Check if username or token is null, undefined, or empty
    if (!username || !token) {
        return res.status(400).send({ msg: "Username or token missing" });
    }

    // Proceed if token matches
    if (tokens[username] === token) {
        for (let account in dealsCache) {
            if (dealsCache.hasOwnProperty(account)) {
                sortedDealsCache[account] = dealsCache[account].slice().sort((a, b) => {
                    return b.time - a.time; // For descending order
                });
            }
        }
        res.status(200).send({ data: sortedDealsCache });
    } else {
        res.status(400).send({ msg: "Wrong Token" });
    }
});

// Login API
app.post('/login', (req, res) => {
    const { username, password } = req.body;
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

app.post('/commandList', (req, res) => {
    var data = req.body;
    let account = data.account;
    account = account.trim();
    if (!account) {
        res.status(400).send('Invalid inputs');
    }
    res.status(200).send(commandCache[account]);
})

app.get('/command', (req, res) => {
    var data = req.body;
    let account = data.account;
    if (!account) {
        res.status(400).send('Invalid inputs');
    }
    res.status(200).send({ data: commandCache[account] });
})

app.post('/command', (req, res) => {
    var data = req.body;
    let commandId = uuidv4();
    let commandData = { ...data, id: commandId, status: COMMAND_STATUS_PENDING, time: new Date().getTime() };
    let account = req.body.account;
    if (account) {
        if (!commandCache[account]) {
            commandCache[account] = [];
        }
        commandCache[account].push(commandData);
    } else {
        res.status(401).send('Invalid data');
    }
    res.json({
        message: 'Command Received and stored',
        commandData: commandData
    })
})

// POST endpoint to ingest data
app.post('/deals', (req, res) => {
    var data = req.body;

    if (data.dummy) delete data.dummy;
  
    let account = data.account;
    let id = data.id;
    if (account) {
        if (!allDealsCache[account]) {
            allDealsCache[account] = [];
        }
        for (var i = 0; i < commandCache[account].length; i++) {
            console.log("command: %s command_ack: %s", commandCache[account][i].id, id);
            if (commandCache[account][i].id === id) {
                commandCache[account][i].status = COMMAND_STATUS_COMPLETED;
            }
        }
        if (data.deals) {
            allDealsCache[account] = JSON.parse(data.deals);
        }
    }
    res.status(200).send('Data received successfully');
});

app.post('/iot', (req, res) => {
    var data = req.body;
    console.log(data);
    res.status(200).send('Data received successfully');
});

app.get('/deals', (req, res) => {
    var data = req.body;
    let account = data.account;
    if (!account) {
        res.status(400).send('Invalid inputs');
    }
    res.status(200).send({ data: allDealsCache[account] });
})

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}, available users: ${users}`);
});