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
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.createStop(req.body, (err, entity, code) => {
			if (err) {
				res.status(code)
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
	}
});

// List all stops
app.get('/stops', (req, res, next) => {
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.listStops(req, (err, entities, total, nextId) => {
			if (err) {
				res.status(404)
					.set({ "Content-Type": "application/json" })
					.send(err);
			} else {
				entities.forEach(e => {
					e.self = req.protocol + '://' + req.headers.host + '/stops/' + e.id;
					e.issues.forEach(i => {
						i.self = req.protocol + '://' + req.headers.host + '/issues/' + i.id;
					});
				});
				let response = { 
					"results": entities, 
					"total_items": total 
				};
				if (nextId) {
					response.next = req.protocol + '://' + req.headers.host + '/stops?cursor=' + encodeURIComponent(nextId);
				}
				res.status(200)
					.set({ "Content-Type": "application/json" })
					.send(response);
			}
		});
	}
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
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.getStop(req.params.stop_id, (err, entity) => {
			if (err) {
				res.status(404)
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
	}
});

// Replace a stop
app.put('/stops/:stop_id', (req, res, next) => {
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.replaceStop(req.params.stop_id, req.body, (err, entity, code) => {
			if (err) {
				res.status(code)
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
	}
});

// Update a stop
app.patch('/stops/:stop_id', (req, res, next) => {
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.updateStop(req.params.stop_id, req.body, (err, entity, code) => {
			if (err) {
				res.status(code)
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
	}
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

/* 
 * ISSUE REQUESTS
 */

// Create a new issue
app.post('/issues', verify, (req, res, next) => {
	if (req.userid) {
		if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			model.createIssue(req.body, req.userid, (err, entity, code) => {
				if (err) {
					res.status(code)
						.set({ "Content-Type": "application/json" })
						.send(err);
				} else {
					entity.self = req.protocol + '://' + req.headers.host + '/issues/' + entity.id;
					res.status(code)
						.set({
							"Content-Type": "application/json",
							"Content-Location": entity.self
						})
						.send(entity);
				}
			});
		}
	} else {
		let err = { "Error": "The request object is missing credentials or supplied credentials are invalid"};
		res.status(401).send(err);
	}
});

// List all issues
app.get('/issues', (req, res, next) => {
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.listIssues(req, (err, entities, total, nextId) => {
			if (err) {
				res.status(404)
					.set({ "Content-Type": "application/json" })
					.send(err);
			} else {
				entities.forEach(e => {
					e.self = req.protocol + '://' + req.headers.host + '/issues/' + e.id;
					if (e.stop) {
						let stopId = e.stop;
						e.stop = {};
						e.stop.id = stopId;
						e.stop.self = req.protocol + '://' + req.headers.host + '/stops/' + stopId;
					}
				});
				let response = { 
					"results": entities, 
					"total_items": total 
				};
				if (nextId) {
					response.next = req.protocol + '://' + req.headers.host + '/issues?cursor=' + encodeURIComponent(nextId);
				}
				res.status(200)
					.set({ "Content-Type": "application/json" })
					.send(response);
			}
		});
	}
});

// Put all issues 405 error
app.put('/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a PUT request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, POST"
		})
		.send(err);
});

// Patch all issues 405 error
app.patch('/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a PATCH request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, POST"
		})
		.send(err);
});

// Delete all issues 405 error
app.delete('/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a DELETE request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, POST"
		})
		.send(err);
});

// Get an issue
app.get('/issues/:issue_id', (req, res, next) => {
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.getIssue(req.params.issue_id, (err, entity) => {
			if (err) {
				res.status(404)
					.set({ "Content-Type": "application/json" })
					.send(err);
			} else {
				entity.self = req.protocol + '://' + req.headers.host + '/issues/' + entity.id;
				if (entity.stop) {
					let stopId = entity.stop;
					entity.stop = {};
					entity.stop.id = stopId;
					entity.stop.self = req.protocol + '://' + req.headers.host + '/stops/' + stopId;
				}
				res.status(200)
					.set({ "Content-Type": "application/json" })
					.send(entity);
			}
		});
	}
});

// Replace an issue
app.put('/issues/:issue_id', verify, (req, res, next) => {
	if (req.userid) {
		if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			model.replaceIssue(req.params.issue_id, req.body, req.userid, (err, entity, code) => {
				if (err) {
					res.status(code)
						.set({ "Content-Type": "application/json" })
						.send(err);
				} else {
					entity.self = req.protocol + '://' + req.headers.host + '/issues/' + entity.id;
					if (entity.stop) {
						let stopId = entity.stop;
						entity.stop = {};
						entity.stop.id = stopId;
						entity.stop.self = req.protocol + '://' + req.headers.host + '/stops/' + stopId;
					}
					res.status(code)
						.set({
							"Content-Type": "application/json",
							"Content-Location": entity.self
						})
						.send(entity);
				}
			});
		}
	} else {
		let err = { "Error": "The request object is missing credentials or supplied credentials are invalid"};
		res.status(401).send(err);
	}
});

// Update an issue
app.patch('/issues/:issue_id', verify, (req, res, next) => {
	if (req.userid) {
		if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			model.updateIssue(req.params.issue_id, req.body, req.userid, (err, entity, code) => {
				if (err) {
					res.status(code)
						.set({ "Content-Type": "application/json" })
						.send(err);
				} else {
					entity.self = req.protocol + '://' + req.headers.host + '/issues/' + entity.id;
					if (entity.stop) {
						let stopId = entity.stop;
						entity.stop = {};
						entity.stop.id = stopId;
						entity.stop.self = req.protocol + '://' + req.headers.host + '/stops/' + stopId;
					}
					res.status(code)
						.set({
							"Content-Type": "application/json",
							"Content-Location": entity.self
						})
						.send(entity);
				}
			});
		}
	} else {
		let err = { "Error": "The request object is missing credentials or supplied credentials are invalid"};
		res.status(401).send(err);
	}
});

// Delete an issue
app.delete('/issues/:issue_id', verify, (req, res, next) => {
	if (req.userid) {
		model.deleteIssue(req.params.issue_id, req.userid, (err, code) => {
			if (err) {
				res.status(code)
					.set({ "Content-Type": "application/json" })
					.send(err);
			} else {
				res.status(204)
					.set({ "Content-Type": "application/json" })
					.send();
			}
		});
	} else {
		let err = { "Error": "The request object is missing credentials or supplied credentials are invalid"};
		res.status(401).send(err);
	}
});

// Post issue 405 error
app.post('/issues/:issue_id', (req, res, next) => {
	let err = { "Error": "URL does not support a POST request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET, PUT, PATCH, DELETE"
		})
		.send(err);
});

// List user's issues
app.get('/users/:user_id/issues', verify, (req, res, next) => {
	if (req.userid && req.userid == req.params.user_id) {
		if (!req.accepts('json')) {
			let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
			res.status(406)
				.set({ "Content-Type": "application/json" })
				.send(err);
		} else {
			model.listIssues(req, (err, entities, nextId) => {
				if (err) {
					res.status(404)
						.set({ "Content-Type": "application/json" })
						.send(err);
				} else {
					entities.forEach(e => {
						e.self = req.protocol + '://' + req.headers.host + '/issues/' + e.id;
						if (e.stop) {
							let stopId = e.stop;
							e.stop = {};
							e.stop.id = stopId;
							e.stop.self = req.protocol + '://' + req.headers.host + '/stops/' + stopId;
						}
					});
					let response = { "results": entities };
					if (nextId) {
						response.next = req.protocol + '://' + req.headers.host + '/issues?cursor=' + nextId;
					}
					res.status(200)
						.set({ "Content-Type": "application/json" })
						.send(response);
				}
			});
		}
	} else if (req.userid) {
		let err = { "Error": "The credentials do not belong to the user with this user_id"};
		res.status(403).send(err);
	} else {
		let err = { "Error": "The request object is missing credentials or supplied credentials are invalid"};
		res.status(401).send(err);
	}
});

// Post user issues 405 error
app.post('/users/:user_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a POST request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});

// Put user issues 405 error
app.put('/users/:user_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a PUT request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});

// Patch user issues 405 error
app.patch('/users/:user_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a PATCH request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});

// Delete user issues 405 error
app.delete('/users/:user_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a DELETE request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});


/* 
 * STOP-ISSUE INTERACTION REQUESTS
 */

// List all issues for a stop
app.get('/stops/:stop_id/issues', (req, res, next) => {
	if (!req.accepts('json')) {
		let err = { "Error": "Requested content format is not supported or was not provided in the request object" };
		res.status(406)
			.set({ "Content-Type": "application/json" })
			.send(err);
	} else {
		model.getStopIssues(req.params.stop_id, (err, entities) => {
			if (err) {
				res.status(404)
					.set({ "Content-Type": "application/json" })
					.send(err);
			} else {
				entities.forEach(e => {
					e.self = req.protocol + '://' + req.headers.host + '/issues/' + e.id;
					if (e.stop) {
						let stopId = e.stop;
						e.stop = {};
						e.stop.id = stopId;
						e.stop.self = req.protocol + '://' + req.headers.host + '/stops/' + stopId;
					}
				});
				res.status(200)
					.set({ "Content-Type": "application/json" })
					.send(entities);
			}
		});
	}
});

// Post stop all issues 405 error
app.post('/stops/:stop_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a POST request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});

// Put stop all issues 405 error
app.put('/stops/:stop_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a PUT request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});

// Patch stop all issues 405 error
app.patch('/stops/:stop_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a PATCH request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});

// Delete stop all issues 405 error
app.delete('/stops/:stop_id/issues', (req, res, next) => {
	let err = { "Error": "URL does not support a DELETE request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "GET"
		})
		.send(err);
});

// Add a stop to an issue
app.put('/stops/:stop_id/issues/:issue_id', verify, (req, res, next) => {
	if (req.userid) {
		model.addStopToIssue(req.params.stop_id, req.params.issue_id, req.userid, (err, code) => {
			if (err) {
				res.status(code).send(err);
			} else {
				res.status(code).send();
			}
		});
	} else {
		let err = { "Error": "The request object is missing credentials or supplied credentials are invalid"};
		res.status(401).send(err);
	}
});

// Remove a stop from an issue
app.delete('/stops/:stop_id/issues/:issue_id', verify, (req, res, next) => {
	if (req.userid) {
		model.removeStopFromIssue(req.params.stop_id, req.params.issue_id, req.userid, (err, code) => {
			if (err) {
				res.status(code).send(err);
			} else {
				res.status(code).send();
			}
		});
	} else {
		let err = { "Error": "The request object is missing credentials or supplied credentials are invalid"};
		res.status(401).send(err);
	}
});

// Post stop issues 405 error
app.post('/stops/:stop_id/issues/:issue_id', (req, res, next) => {
	let err = { "Error": "URL does not support a POST request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "PUT, DELETE"
		})
		.send(err);
});

// Patch stop issues 405 error
app.patch('/stops/:stop_id/issues/:issue_id', (req, res, next) => {
	let err = { "Error": "URL does not support a PATCH request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "PUT, DELETE"
		})
		.send(err);
});

// Get stop issues 405 error
app.get('/stops/:stop_id/issues/:issue_id', (req, res, next) => {
	let err = { "Error": "URL does not support a GET request" };
	res.status(405)
		.set({ 
			"Content-Type": "application/json",
			"Allow": "PUT, DELETE"
		})
		.send(err);
});


// Listen to the App Engine-specific port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});