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


/* 
 * STOP REQUESTS
 */

// Create a new stop
app.post('/stops', (req, res, next) => {
	model.createStop(req.body, (err, entity, code) => {
		if (err) {
			res.status(code)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			entity.self = req.protocol + '://' + req.headers.host + '/stops/' + entity.id;
			res.status(code)
				.set({
					"Content-Type": "application/json",
					"Content-Location": entity.self
				})
				.send(entity);
		}
	});
});

// List all stops
app.get('/stops', (req, res, next) => {
	model.listStops(req, (err, entities, nextId) => {
		if (err) {
			res.status(404)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			entities.forEach(e => {
				e.self = req.protocol + '://' + req.headers.host + '/stops/' + e.id;
				e.issues.forEach(i => {
					i.self = req.protocol + '://' + req.headers.host + '/issues/' + i.id;
				});
			});
			let response = { "results": entities };
			if (nextId) {
				response.next = req.protocol + '://' + req.headers.host + '/stops?cursor=' + nextId;
			}
			res.status(200)
				.set({ "Content-Type": "application/json" })
				.send(response);
		}
	});
});

// Put all stops 405 error
app.put('/stops', (req, res, next) => {
	let err = { "Error": "URL does not support a PUT request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, POST"
		})
		.send(err);
});

// Patch all stops 405 error
app.patch('/stops', (req, res, next) => {
	let err = { "Error": "URL does not support a PATCH request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, POST"
		})
		.send(err);
});

// Delete all stops 405 error
app.delete('/stops', (req, res, next) => {
	let err = { "Error": "URL does not support a DELETE request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, POST"
		})
		.send(err);
});

// Get a stop
app.get('/stops/:stop_id', (req, res, next) => {
	model.getStop(req.params.stop_id, (err, entity) => {
		if (err) {
			res.status(404)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			entity.self = req.protocol + '://' + req.headers.host + '/stops/' + entity.id;
			entity.issues.forEach(i => {
				i.self = req.protocol + '://' + req.headers.host + '/issues/' + i.id;
			});
			res.status(200)
				.set({ "Content-Type": "application/json" })
				.send(entity);
		}
	});
});

// Replace a stop
app.put('/stops/:stop_id', (req, res, next) => {
	model.replaceStop(req.params.stop_id, req.body, (err, entity, code) => {
		if (err) {
			res.status(code)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			entity.self = req.protocol + '://' + req.headers.host + '/stops/' + entity.id;
			entity.issues.forEach(i => {
				i.self = req.protocol + '://' + req.headers.host + '/issues/' + i.id;
			});
			res.status(code)
				.set({
					"Content-Type": "application/json",
					"Content-Location": entity.self
				})
				.send(entity);
		}
	});
});

// Update a stop
app.patch('/stops/:stop_id', (req, res, next) => {
	model.updateStop(req.params.stop_id, req.body, (err, entity, code) => {
		if (err) {
			res.status(code)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			entity.self = req.protocol + '://' + req.headers.host + '/stops/' + entity.id;
			entity.issues.forEach(i => {
				i.self = req.protocol + '://' + req.headers.host + '/issues/' + i.id;
			});
			res.status(code)
				.set({
					"Content-Type": "application/json",
					"Content-Location": entity.self
				})
				.send(entity);
		}
	});
});

// Delete a stop
app.delete('/stops/:stop_id', (req, res, next) => {
	model.deleteStop(req.params.stop_id, err => {
		if (err) {
			res.status(404)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			res.status(204)
				.set({ "Content-Type": "application/json" })
				.send();
		}
	});
});

// Post stop 405 error
app.post('/stops/:stop_id', (req, res, next) => {
	let err = { "Error": "URL does not support a POST request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, PUT, PATCH, DELETE"
		})
		.send(err);
});


// Listen to the App Engine-specific port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});