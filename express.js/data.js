var crypto  = require('crypto');

var STATUS_ACTIVE = 0;
var STATUS_COMPLETED = 1;

/* users structure: 
{ username: {
	password, 
	fullname, 
	items : {
		id : {
			value, status}
		}
	}
}*/
var users = {}; 
var sessions = {}; /*structure: {sessionID: username}*/

function register(username, password, fullname) {
	/* checking if user exists in db: */
	if (users.hasOwnProperty(username)) {
		return false;
	} else {
		users[username] = {	'password': calcPasswordHash(username, password), 
							'fullname': fullname,
							'items'	: {} };	
		return true;
	}
}
exports.register = register;

function login(username, password) {
	if (!users.hasOwnProperty(username)) {
		return false;
	} else {
		if (users[username]['password'] === calcPasswordHash(username, password)) {
			return true;
		} else {
			return false;
		}
	}
}
exports.login = login;


function calcPasswordHash(username, password) {
	var salt = 'pro-todo-list#' + username;
	var hash;
	try {
		hash = String(crypto.pbkdf2Sync(password, salt, 10000, 512));
	} catch(e) {
		console.log('error generating hash!');
	}
	return hash;
}


function assignSessionID(username) {
	var TIMEOUT = 30*60*1000; //30 mins
	var sessionID = crypto.randomBytes(20).toString('hex');
	var expDate = new Date(Date.now() + TIMEOUT);
	setTimeout( function () {
		if (sessions[sessionID] !== undefined) {
			delete sessions[sessionID];
		}
	}, TIMEOUT);
	sessions[sessionID] = username;
	return {sid: sessionID, expires: expDate};
}
exports.assignSessionID = assignSessionID;


function getUsernameFromSessionID(sid) {
	return sessions[sid];	//may return undefined if session expired/doesn't exist.
}
exports.getUsernameFromSessionID = getUsernameFromSessionID;


function getItems(username) {
	return users[username].items;
}
exports.getItems = getItems;


function addItem(username, iid, ival) {
	if (users[username].items[iid] === undefined) {
		/* item with that id doesn't exists yet */
		users[username].items[iid] = {	value: ival, 
										status: STATUS_ACTIVE };
		return true;
	} else {
		return false;
	}
}
exports.addItem = addItem;


function updateItem(username, iid, ival, istatus) {
	if (users[username].items[iid] !== undefined) {
		/* item with that id exists, thus can be updated */
		users[username].items[iid].value = ival;
		users[username].items[iid].status = istatus;
		return true;
	}
	return false;
}
exports.updateItem = updateItem;


function deleteItem(username, iid) {
	/* iid -1 = delete all completed items */
	if (iid == -1) {
		for (iid in users[username].items) {
			if (users[username].items[iid].status === STATUS_COMPLETED) {
				delete users[username].items[iid];
			}
		}
		return true;
	} else {
		if (users[username].items[iid] === undefined) {
			return false;
		} else {
			delete users[username].items[iid];
			return true;
		}
	}
}
exports.deleteItem = deleteItem;



