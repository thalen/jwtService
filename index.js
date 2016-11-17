var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var morgan = require('morgan');
var loki = require('lokijs');
var jwt = require('jsonwebtoken');
var config = require('./config');
var xml = require('xml');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization");
    return next();
});
app.set('superSecret', config.secret);

var port = process.env.PORT || 5000;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

var db = new loki('data.json');

var users = db.addCollection('users');
users.insert({"user_id": "olltha", "password": "skolverket"});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });
});

router.post('/authenticate', function(req, res) {
    var result = users.find({"user_id": req.body.user_id});
    if (result.length == 0) {
        //res.json({ success: false, message: 'Authentication failed. User not found.' });
        res.sendStatus(401);
    } else {
        var user = result[0];
        if (user.password != req.body.password) {
            //res.json({ success: false, message: 'Authentication failed. Wrong password.' });
            res.sendStatus(401);
        } else {
            // if user is found and password is right
            // create a token
            var token = jwt.sign(user, app.get('superSecret'), {
                expiresInMinutes: 1440 // expires in 24 hours
            });

            // return the information including token as JSON
            res.json({
                success: true,
                message: 'Enjoy your token!',
                token: token
            });
        }
    }
});

router.use(function(req, res, next) {

    if (req.method == 'OPTIONS') {
        next();
    } else {
        // check header or url parameters or post parameters for token
        var token = req.body.token || req.query.token || req.headers['authorization'];
        var usingHeader = false;
        if (req.headers['authorization']) {
            usingHeader = true;
        }

        // decode token
        if (token) {
            if (usingHeader) {
                var headerArr = token.split(' ');
                token = headerArr.length > 0 ? headerArr[1].trim() : token;
            }
            // verifies secret and checks exp
            jwt.verify(token, app.get('superSecret'), function(err, decoded) {
                if (err) {
                    return res.status(403).send({
                        success: false,
                        message: '´Failed to authenticate token.'
                    });
                } else {
                    // if everything is good, save to request for use in other routes
                    req.decoded = decoded;
                    next();
                }
            });

        } else {

            // if there is no token
            // return an error
            return res.status(403).send({
                success: false,
                message: 'No token provided.'
            });

        }
    }

});

router.get('/user', function(req, res) {
    var foo = {
        nested: [
            { keys: [{ fun: 'hi' }]}
            ]
    };
    var user = {
        user: [
            {user_id: req.decoded.user_id}
        ]
    };
    res.set('Content-Type', 'text/xml');
    res.send(xml(user));
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log("Now I'm restful on port " + port);
