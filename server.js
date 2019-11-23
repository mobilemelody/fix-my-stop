const express = require('express');
const bodyParser = require('body-parser');
const {OAuth2Client} = require('google-auth-library');
const session = require('express-session');
const model = require('./model');
const pug = require('pug');
const app = express();

app.use(bodyParser.json());
app.use(session({secret:'secret'}));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
	res.render('index');
});

// Listen to the App Engine-specific port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});