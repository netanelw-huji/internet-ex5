var http = require('http');

// STARTING SERVER:
var main = require('./main');

var HOST = 'localhost';
var PORT = process.env.PORT || 3000;


var SESSION_ID = null; // updated in login test.


function testWithoutSession_ITEM_GET() {
	logTest('Checking sessionless GET request to /item returns error 400.');
	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'GET',
					path		: '/item'
			 	};
	var req = http.get(opts, function (resp) {
		if (resp.statusCode == 400) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - returned error ' + resp.statusCode + '.');
		}
	});
}

function testWithoutSession_ITEM_POST() {
	logTest('Checking sessionless POST request to /item returns error 400.');
	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/item'
			 	};
	var req = http.get(opts, function (resp) {
		if (resp.statusCode == 400) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - returned error ' + resp.statusCode + '.');
		}
	});
}

function testWithoutSession_ITEM_PUT() {
	logTest('Checking sessionless PUT request to /item returns error 400.');
	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'PUT',
					path		: '/item'
			 	};
	var req = http.get(opts, function (resp) {
		if (resp.statusCode == 400) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - returned error ' + resp.statusCode + '.');
		}
	});
}

function testWithoutSession_ITEM_DELETE() {
	logTest('Checking sessionless DELETE request to /item returns error 400.');
	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'DELETE',
					path		: '/item'
			 	};
	var req = http.get(opts, function (resp) {
		if (resp.statusCode == 400) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - returned error ' + resp.statusCode + '.');
		}
	});
}

function testSpoofedSession_ITEM_GET() {
	logTest('Checking GET request to /item with fake session-id returns error 400.');
	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'GET',
					path		: '/item',
					headers		: {'cookie' : 'sessionId=123'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 400) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
}

function testSpoofedSession_ITEM_POST() {
	logTest('Checking POST request to /item with fake session-id returns error 400.');
	
	var item = JSON.stringify({id:'13', value:'cat'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=1337',
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 400) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testSpoofedSession_ITEM_PUT() {
	logTest('Checking PUT request to /item with fake session-id returns error 400.');
	
	var item = JSON.stringify({id:'1233', value:'cat', status:1});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'PUT',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=1337',
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 400) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testSpoofedSession_ITEM_DELETE() {
	logTest('Checking DELETE request to /item with fake session-id returns error 400.');
	
	var item = JSON.stringify({id:-1});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'DELETE',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=1337',
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 400) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testRegister() {
	logTest('Checking registering a new username returns a 200 response.');
	
	var login = JSON.stringify({username: 'abc', fullname: 'abc def', password: '123'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/register',
					headers		: { 'content-type': 'application/json',
									'content-length': login.length}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 200) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(login);
}

function testRegisterExistingUsername() {
	logTest('Checking registering an existing username returns error 500.');
	
	var login = JSON.stringify({username: 'abc', fullname: 'pikachu', password: 'klmn'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/register',
					headers		: { 'content-type': 'application/json',
									'content-length': login.length}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(login);
}

function testLoginNonExistingUsername() {
	logTest('Checking Logging-in with non-existing username returns error 500.');
	
	var login = JSON.stringify({username: 'non-existing', password: '1234'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/login',
					headers		: { 'content-type': 'application/json',
									'content-length': login.length}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(login);
}

function testLoginWrongPassword() {
	logTest('Checking Logging-in with wrong password returns error 500.');
	
	var login = JSON.stringify({username: 'abc', password: '000'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/login',
					headers		: { 'content-type': 'application/json',
									'content-length': login.length}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(login);
}

function testLogin() {
	logTest('Checking Logging-in with right password returns 200 response \nand a session ID cookie.');
	
	var login = JSON.stringify({username: 'abc', password: '123'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/login',
					headers		: { 'content-type': 'application/json',
									'content-length': login.length}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 200) {
				console.log('SUCCESS');
				var cookie = String(resp.headers['set-cookie']);
				SESSION_ID = cookie.split(';')[0].slice(cookie.indexOf('=')+1);
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(login);
}

function testWithSession_ITEM_GET() {
	logTest('Checking an existing session\'s GET request to /item \nreturns response 200.');
	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'GET',
					path		: '/item',
					headers		: {'cookie' : 'sessionId=' + SESSION_ID}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 200) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
}

function testWithSession_ITEM_POST() {
	logTest('Checking an existing session\'s POST request to /item \nreturns response 500 with status: 0 (success).');
	
	var item = JSON.stringify({id:'13', value:'cat'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=' + SESSION_ID,
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				if (JSON.parse(data).status == 0) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - returned status != 0');
				}
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testWithSession_ITEM_PUT() {
	logTest('Checking an existing session\'s PUT request to /item \nreturns response 500 with status: 0 (success).');
	
	var item = JSON.stringify({id:'13', value:'kitty', status: 0});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'PUT',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=' + SESSION_ID,
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				if (JSON.parse(data).status == 0) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - returned status != 0');
				}
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testWithSession_ITEM_DELETE() {
	logTest('Checking an existing session\'s DELETE request to /item \nreturns response 500 with status: 0 (success).');
	
	var item = JSON.stringify({id:-1});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'DELETE',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=' + SESSION_ID,
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				if (JSON.parse(data).status == 0) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - returned status != 0');
				}
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testNoDuplicateId_ITEM_POST() {
	logTest('Checking that a POST request to /item with an existing item id \nreturns response 500 with status: 1 (failure).');
	
	var item = JSON.stringify({id:'13', value:'dog'});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=' + SESSION_ID,
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				if (JSON.parse(data).status == 1) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - returned status != 1');
				}
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testNonExistingId_ITEM_PUT() {
	logTest('Checking that a PUT request to /item with a non-existing item id \nreturns response 500 with status: 1 (failure).');
	
	var item = JSON.stringify({id:'666', value:'kitty', status: 0});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'PUT',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=' + SESSION_ID,
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				if (JSON.parse(data).status == 1) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - returned status != 0');
				}
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}

function testNonExistingId_ITEM_DELETE() {
	logTest('Checking that a DELETE request to /item with a non-existing item id \nreturns response 500 with status: 1 (failure).');
	
	var item = JSON.stringify({id:1337});

	var opts = 	{	hostname 	: HOST,
					port 		: PORT,
					method		: 'DELETE',
					path		: '/item',
					headers		: {	'cookie' : 'sessionId=' + SESSION_ID,
									'content-length' : item.length,
									'content-type': 'application/json'}
			 	};
	var req = http.get(opts, function (resp) {
		resp.on('data', function (data) {
			if (resp.statusCode == 500) {
				if (JSON.parse(data).status == 1) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - returned status != 0');
				}
			} else {
				console.log('FAILED - returned error ' + resp.statusCode + '.');
			}
		});
	});
	req.write(item);
}





function logTest(description) {
	console.log('\n-------------------------------------------------------------------------');
	console.log(description);
	console.log('-------------------------------------------------------------------------');
}

function test() {
	var TESTS = [];
	var TEST_TIME = 1500;
	var i;

	console.log('\n');

	TESTS.push(testWithoutSession_ITEM_GET); 
	TESTS.push(testWithoutSession_ITEM_POST); 
	TESTS.push(testWithoutSession_ITEM_PUT); 
	TESTS.push(testWithoutSession_ITEM_DELETE); 
	TESTS.push(testSpoofedSession_ITEM_GET);
	TESTS.push(testSpoofedSession_ITEM_POST);
	TESTS.push(testSpoofedSession_ITEM_PUT);
	TESTS.push(testSpoofedSession_ITEM_DELETE);
	TESTS.push(testRegister);
	TESTS.push(testRegisterExistingUsername);
	TESTS.push(testLoginNonExistingUsername);
	TESTS.push(testLoginWrongPassword);
	TESTS.push(testLogin);
	TESTS.push(testWithSession_ITEM_GET);
	TESTS.push(testWithSession_ITEM_POST);
	TESTS.push(testWithSession_ITEM_PUT);
	TESTS.push(testWithSession_ITEM_DELETE);
	TESTS.push(testNoDuplicateId_ITEM_POST);
	TESTS.push(testNonExistingId_ITEM_PUT);
	TESTS.push(testNonExistingId_ITEM_DELETE);


	setTimeout(function () {
		console.log('\n\n#########################################################################');
		console.log('#########################################################################');
	}, 100);
	
	for(i=0 ; i<TESTS.length ; i++) {
		setTimeout(TESTS[i],i*TEST_TIME+200);
	}

	setTimeout(function () {
		console.log('\n#########################################################################');
		console.log('#########################################################################');
		console.log('\nCheck that there are no FAILED tests!\n');
	}, i*TEST_TIME+200);
}

test();


