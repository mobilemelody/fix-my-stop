require('dotenv').config();

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

/* 
 * AUTHENTICATION INTERFACE
 */

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const oAuth2Client = new OAuth2Client(
	CLIENT_ID,
	CLIENT_SECRET,
	'https://fix-my-stop.appspot.com/auth'
);

app.get('/', (req, res) => {
	res.render('index');
});

app.get('/auth', (req, res) => {
	// Get access token
	if (req.query.code) {
		oAuth2Client.getToken(req.query.code, (err, tokens) => {
			oAuth2Client.setCredentials(tokens);
			req.session.id_token = tokens.id_token;
			res.redirect('/user');
		});
	}

	// Redirect to Google OAuth server
	else {
		const authUrl = oAuth2Client.generateAuthUrl({
			scope: 'openid profile email'
		});
		res.redirect(authUrl);
	}
});

app.get('/user', (req, res) => {
	let data = { 'id_token': req.session.id_token };
	res.render('user', data);
});

async function verify(req, res, next) {
	if (req.headers.authorization) {
		const header = req.headers.authorization.split(' ');
		const token = header[1];
		const ticket = await oAuth2Client.verifyIdToken({
			idToken: token,
			audience: CLIENT_ID,
		}).catch((err) => {
			console.error(err);
			next();
		});
		if (ticket) {
			const payload = ticket.getPayload();
			req.userid = payload['sub'];
			next();
		} else {
			next();
		}
	} else {
		next();
	}
}


// Listen to the App Engine-specific port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});