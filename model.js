const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();

/* 
 * HELPER FUNCTIONS
 */

// Translate from Datastore entity format to application JSON format
function fromDatastore(obj) {
	obj.id = obj[Datastore.KEY].id;
	return obj;
}

// Translate from application JSON format to Datastore entity format
function toDatastore(obj) {
	const results = [];
	Object.keys(obj).forEach(k => {
		if (obj[k] === undefined) {
			return;
		}
		results.push({
			name: k,
			value: obj[k],
		});
	});
	return results;
}

// Add entity to Datastore
function saveEntity(key, data, cb) {
	// Setup entity with key and data
	const entity = {
		key: key,
		data: toDatastore(data)
	}

	// Save entity to datastore
	ds.save(entity, err => {
		data.id = entity.key.id;
		cb(err, err ? null : data);
	});
}

// Get entity from Datastore
function getEntity(key, kind, cb) {
	ds.get(key, (err, entity) => {

		// Check if entity not found
		if (!err && !entity) {
			let err = { "Error": "No " + kind + " with this " + kind + "_id exists" };
			cb(err, err);
		}

		// Otherwise pass entity data
		else {
			cb(err, err ? null : fromDatastore(entity));
		}

	});
}

// Delete entity from Datastore
function deleteEntity(key, kind, cb) {
	ds.get(key, (err, entity) => {

		// Check if entity not found
		if (!err && !entity) {
			let err = { "Error": "No " + kind + " with this " + kind + "_id exists" };
			cb(err);
		}

		// Otherwise delete entity
		else {
			ds.delete(key, cb);
		}

	});
}

// Convert string of ids to array of objects
function strToObject(str) {
	let arr = [];
	str = str ? str.split(' ') : [];
	str.forEach(e => {
		arr.push({ 'id' : e });
	});
	return arr;
}

/* 
 * STOP CRUD FUNCTIONS
 */

// Create a stop
function createStop(data, cb) {
	let key = ds.key('Stop');

	// Check for required attributes
	if (!('name' in data && 'lat' in data && 'lon' in data)) {
		let err = { "Error": "The request object is missing at least one of the required attributes" };
		cb(err, err, 400);
	}

	else {
		data.ridership = data.ridership || null;
		saveEntity(key, data, (err, entity) => {
			entity.issues = [];
			cb(err, entity, 201);
		});
	}
}

// List all stops
function listStops(req, cb) {
	let q = ds.createQuery(['Stop']).limit(5);
	let next;

	// If query cursor is specified, add cursor to query
	if (req.query.cursor) {
		q = q.start(req.query.cursor);
	}

	// Run query
	ds.runQuery(q, (err, entities, info) => {
		if (err) {
			let err = { "Error": "Invalid cursor value provided" };
			cb(err, err, null);
		}

		else {
			entities = entities.map(fromDatastore);

			// If there are more items, create next link
			if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
				next = info.endCursor;
			}

			// Add issues to each stop
			let stopsProcessed = 0;
			entities.forEach(e => {
				getStopIssues(e.id, (err, issues) => {
					e.issues = issues;
					stopsProcessed++;

					// If all stops have been processed, run callback
					if (stopsProcessed == entities.length) {
						cb(err, entities, next);
					}
				});
			});
		}
	});
}

// Get a stop
function getStop(id, cb) {
	const key = ds.key(['Stop', parseInt(id, 10)]);
	getEntity(key, 'stop', (err, entity) => {
		if (!err) {
			entity.issues = strToObject(entity.issues);
		}
		getStopIssues(id, (err, issues) => {
			entity.issues = issues;
			cb(err, entity);
		});
	});
}

// Replace a stop
function replaceStop(id, data, cb) {
	const key = ds.key(['Stop', parseInt(id, 10)]);

	// Check for required attributes and validate
	if (!('name' in data && 'lat' in data && 'lon' in data)) {
		let err = { "Error": "The request object is missing at least one of the required attributes" };
		cb(err, err, 400);
	}

	// Otherwise, update stop
	else {
		getEntity(key, 'stop', (err, entity) => {
		if (err) {
			cb(err, err, 404);
		} else {
			data.ridership = data.ridership || null;
			saveEntity(key, data, (err, entity) => {
				getStopIssues(id, (err, issues) => {
					entity.issues = issues;
					cb(err, entity, 201);
				});
			});
		}
	}
}

// Update a stop
function updateStop(id, data, cb) {
	const key = ds.key(['Stop', parseInt(id, 10)]);

	getEntity(key, 'stop', (err, entity) => {
		if (err) {
			cb(err, err, 404);
		} else {
			data.name = data.name || entity.name;
			data.lat = data.lat || entity.lat;
			data.lon = data.lon || entity.lon;
			data.ridership = data.ridership || entity.ridership;

			saveEntity(key, data, (err, entity) => {
				getStopIssues(id, (err, issues) => {
					entity.issues = issues;
					cb(err, entity, 200);
				});
			});
		}
	});
}

// Delete a stop
function deleteStop(id, cb) {
	const key = ds.key(['Stop', parseInt(id, 10)]);

	// Remove stop from any issues
	let issuesRemoved = 0;
	getStopIssues(id, (err, issues) => {
		if (err) {
			cb(err);
		} else {
			issues.forEach(i => {
				removeStopFromIssue(id, i.id, (err, code) => {
					issuesRemoved++;

					// If all issues have been removed, run callback
					if (issuesRemoved == issues.length) {
						deleteEntity(key, 'stop', cb);
					}
				});
			});
		}
	});
}

/* 
 * STOP-ISSUE INTERACTION FUNCTIONS
 */

// Add stop to issue
async function addStopToIssue(stopId, issueId, cb) {
	const stopKey = ds.key(['Stop', parseInt(stopId, 10)]);
	const issueKey = ds.key(['Issue', parseInt(issueId, 10)]);
	let [stopEntity] = await ds.get(stopKey);
	let [issueEntity] = await ds.get(issueKey);

	// Check if stop and issue exist
	if (!stopEntity || !issueEntity) {
		let err = { "Error": "The specified stop and/or issue do not exist" };
		cb(err, 404);
	}

	// Check if a stop is already assigned to the issue
	else if (issueEntity.stop) {
		let err = { "Error": "A stop is already assigned to this issue" };
		cb(err, 400);
	}

	// Otherwise, add stop to issue
	else {
		issueEntity.stop = stopId;
		saveEntity(issueKey, issueEntity, (err, entity) => {
			cb(err, 204);
		});
	}
}

// Remove stop from issue
async function removeStopFromIssue(stopId, issueId, cb) {
	const stopKey = ds.key(['Stop', parseInt(stopId, 10)]);
	const issueKey = ds.key(['Issue', parseInt(issueId, 10)]);
	let [stopEntity] = await ds.get(stopKey);
	let [issueEntity] = await ds.get(issueKey);

	// Check if stop and issue exist and stop is assigned to issue
	if (!stopEntity || !issueEntity || issueEntity.stop != stopId) {
		let err = { "Error": "No stop with this stop_id is assigned to an issue with this issue_id" };
		cb(err, 404);
	}

	// Otherwise, remove stop from issue
	else {
		issueEntity.stop = null;
		saveEntity(issueKey, issueEntity, (err, entity) => {
			cb(err, 204);
		});
	}
}

// Get all issues for a stop
function getStopIssues(stopId, cb) {
	const stopKey = ds.key(['Stop', parseInt(stopId, 10)]);

	getEntity(key, 'stop', (err, entity) => {
		if (err) {
			cb(err, err);
		} else {
			let q = ds.createQuery(['Issue']).filter('stop', '=', stopId);
			ds.runQuery(q, (err, entities) => {
				cb(err, err ? null : entities.map(fromDatastore));
			});
		}
	});
}


module.exports = {
	createStop,
	listStops,
	getStop,
	replaceStop,
	updateStop,
	deleteStop,
	addStopToIssue,
	removeStopFromIssue,
	getStopIssues
};