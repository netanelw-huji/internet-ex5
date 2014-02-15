var path = require('path');
var data = require('./data');
var miniExpress = require('express');  // USING EXPRESS INSTEAD OF MINIEXPRESS


var app = miniExpress();
var port = process.env.PORT || 3000;
console.log('Server init.');

var STATUS_SUCCESS = 0;
var STATUS_FAILURE = 1;


app.use(miniExpress.bodyParser());
app.use(miniExpress.cookieParser());

app.post('/login', function (req, res) {  /* using POST instead of GET so it'll work with ajax. -Ohad @moodle */
	var username = req.body.username;
	var password = req.body.password; 
	if (username === undefined) {
		res.json(500,{status: STATUS_FAILURE, msg: "Username wasn't provided."});
	} else if (password === undefined) {
		res.json(500,{status: STATUS_FAILURE, msg: "Password wasn't provided."});
	} else {
		if (data.login(username, password) == false) {
			res.json(500,{status: STATUS_FAILURE, msg: "Username + Password don't match."});
		} else {
			/* login successful - creating session ID */
			// console.log("- login: (" + username + "," + password + ").");
			var sess = data.assignSessionID(username);
			res.cookie('sessionId',sess.sid, {'expires': sess.expires});
			res.json(200, {status: STATUS_SUCCESS, msg: "Login succesful."});		
		}
	}
});

app.post('/register', function (req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var fullname = req.body.fullname;
	if (username === undefined) {
		res.json(500,{status: STATUS_FAILURE, msg: "Username wasn't provided."});
	} else if (password === undefined) {
		res.json(500,{status: STATUS_FAILURE, msg: "Password wasn't provided."});
	} else if (fullname === undefined) {
		res.json(500,{status: STATUS_FAILURE, msg: "Full-name wasn't provided."});
	} else {
		if (data.register(username, password, fullname) === false) {
			/* user exists */
			res.json(500,{status: STATUS_FAILURE, msg: "User already exists."});
		} else {
			//registered successfuly 
			// console.log("- register: (" + username + "," + password + "," + fullname + ").");
			res.json(200, {status: STATUS_SUCCESS, msg: "Registered succesfuly."});
		}
	}
});

app.get('/item', function (req,res) {
	var username = data.getUsernameFromSessionID(req.cookies['sessionId'] || '');
	if (username === undefined) {
		res.json(400, {status: STATUS_FAILURE, msg: "Session doesn't exist / expired."});
	} else {
		var items = data.getItems(username);
		res.json(items);
	}
});

app.post('/item', function (req,res) {
	var username = data.getUsernameFromSessionID(req.cookies['sessionId'] || '');
	if (username === undefined) {
		res.json(400, {status: STATUS_FAILURE, msg: "Session doesn't exist / expired."});
	} else {
		if (data.addItem(username, req.body.id, req.body.value) == true) {
			res.json(500, {status: STATUS_SUCCESS, msg: "Added item successfuly."});
		} else {
			res.json(500, {status: STATUS_FAILURE, msg: "Item ID already exists."});
		}
	}
});

app.put('/item', function (req,res) {
	var username = data.getUsernameFromSessionID(req.cookies['sessionId'] || '');
	if (username === undefined) {
		res.json(400, {status: STATUS_FAILURE, msg: "Session doesn't exist / expired."});
	} else {
		if (data.updateItem(username, req.body.id, req.body.value, req.body.status) == true) {
			res.json(500, {status: STATUS_SUCCESS, msg: "Updated item successfuly."});
		} else {
			res.json(500, {status: STATUS_FAILURE, msg: "Item ID doesn't exists."});
		}
	}
});

app.delete('/item', function (req,res) {
	var username = data.getUsernameFromSessionID(req.cookies['sessionId'] || '');
	if (username === undefined) {
		res.json(400, {status: STATUS_FAILURE, msg: "Session doesn't exist / expired."});
	} else {
		if (data.deleteItem(username, req.body.id) == true) {
			res.json(500, {status: STATUS_SUCCESS, msg: "Deleted item successfuly."});
		} else {
			res.json(500, {status: STATUS_FAILURE, msg: "Item ID doesn't exists."});
		}
	}
});

app.use('/', function (req,resp,next) {	
	/* redirecting '/' to '/index.html' in order to create a RESTful API */
	if (req.path === '/') {
		req.path = path.join(req.path,"index.html");
	}
	(miniExpress.static(__dirname + '/www'))(req,resp,next);
});

app.listen(port);



function htmlError(errCode, errMsg) {
	return 	"<html><head><title>Error " + errCode + "</title></head>" + 
			"<body><h1>Error " + errCode + "</h1><br />" + 
			errMsg + "</body></html>";
}