// var net = require('net');
var miniHttp = require('./miniHttp');

exports = module.exports = function () {
	return new miniExpress();
}

function miniExpress() {
	var app = function (request, response) {
		var req = new expRequest(request);		//miniExpress' wrapper for the miniHttp's request.
		var resp = new expResponse(response);	//miniExpress' wrapper for the miniHttp's response.

		//only allow GET,POST,PUT,DELETE requests:
		var reqMethod = req.methodName.toLowerCase();
		if (reqMethod != 'get' && reqMethod != 'post' && reqMethod != 'put' && reqMethod != 'delete') {
			var errStr = 	'<html><head><title>Error</title></head><body>' + 
							'<h1>Error 405</h1><br />Error 405 - Method Not Allowed: ' + 
							'\nexpecting GET/POST/PUT/DELETE requests only.</body></html>';
			resp.status(405).send(errStr); // error 405 - method not allowed.
		}


		var next = function () {
			if (resp.finishedRoutes) {
				return;
			}
			req.params = {}; //reset. param are only relevant for a specific route.

			var takenRoute = -1;	//this value will choose the next taken route.
			var curRoute;

			while (next.handlerIndex < app.routes.length) {
				curRoute = app.routes[next.handlerIndex];
				if (curRoute.method != req.methodName.toLowerCase() && curRoute.method != 'all') {   // wrong method
					next.handlerIndex++;
				} else {
					var m = curRoute.regexp.exec(req.path);
					if (!m) {
						next.handlerIndex++;
					} else {
						// the resource matched path without the trailing chars:
						// i.e. resource: '/www/:user', path = '/www/foo/bar/a.css',
						// then: m[0] = /www/foo/bar/a.css, m[1] = /www/foo.
						next.matchedPath = m[1]; 	
						if (curRoute.keys != null) {
							//parse params according to the found route:
							for (var i = 0 ; i < curRoute.keys.length ; i++) {
								req.params[curRoute.keys[i]] = m[i+2]; //index 0 is the full match, 1 is the resource match path.
							}
						}
						takenRoute = next.handlerIndex;
						next.handlerIndex++;
						break;
					}
				}
			}

			if (takenRoute != -1) {		// found a route that matches the request's path.
				app.routes[takenRoute].callback(req,resp,next);
			} else {	// went over all handlers without ever calling send() or json().
				var errStr = 	'<html><head><title>Error</title></head><body>' + 
								'<h1>Error 404</h1><br />Error 404 - Not Found: ' + 
								'\nrequested resource couldn\'t be located on the server.</body></html>';
				resp.status(404).send(errStr); // error 404.
			}

		};
		next.handlerIndex = 0;
		next.matchedPath = '';

		// ~~~~   THIS IS WHERE THE MAGIC HAPPENS:   ~~~~
		next();
	};

	app.routes = [];
	app.route = {}; //will hold data about all the routes registered with get/post/delete/put (not use).

	app.listen = function(port) {
		var server = miniHttp.createServer(this);
		return server.listen(port);
	};

	app.use = function (resource, requestHandler) {	//resource is optional.
		if (typeof resource == 'function') { // i.e. only 1 arg
			requestHandler = resource;
			resource = '/';
		}
		this.routes.push(new Route('all', resource, requestHandler));
	};

	app.get = function (resource, requestHandler) {	//resource is optional.
		if (typeof resource == 'function') { // i.e. only 1 arg
			requestHandler = resource;
			resource = '/';
		}
		var route = new Route('get', resource, requestHandler);
		this.routes.push(route);
		registerRoute(route);
	};

	app.post = function (resource, requestHandler) {	//resource is optional.
		if (typeof resource == 'function') { // i.e. only 1 arg
			requestHandler = resource;
			resource = '/';
		}
		var route = new Route('post', resource, requestHandler);
		this.routes.push(route);
		registerRoute(route);
	};

	app.delete = function (resource, requestHandler) {	//resource is optional.
		if (typeof resource == 'function') { // i.e. only 1 arg
			requestHandler = resource;
			resource = '/';
		}
		var route = new Route('delete', resource, requestHandler);
		this.routes.push(route);
		registerRoute(route);
	};

	app.put = function (resource, requestHandler) {	//resource is optional.
		if (typeof resource == 'function') { // i.e. only 1 arg
			requestHandler = resource;
			resource = '/';
		}
		var route = new Route('put', resource, requestHandler);
		this.routes.push(route);
		registerRoute(route);
	};

	function registerRoute(r) {
		var registered = false;

		if(app.route[r.method] === undefined) {
			app.route[r.method] = [];
		}

		for (var i=0 ; i < app.route[r.method] && !registered ; i++) {
			if (app.route[r.method][i].path == r.path) {
				app.route[r.method][i].callbacks.push(r.callback);
				registered = true;
			}
		}
		if (!registered) {
			app.route[r.method].push({	path: 		r.path,
										method: 	r.method,
										callbacks: 	[r.callback],
										keys: 		r.keys,
										regexp: 	r.regexp 	});						
		}
	}

	return app;
}

var RES_PARAM_REGEX = /(\/:[^\/\\]+)/g;
var RES_PARAM_PHOLDER = '\/([^\\/\\\\]+)';	

function Route(method, path, reqHandler) {
	path = this.fixUsePath(path);

	this.path = path;
	this.method = method;
	this.callback = reqHandler;
	this.keys = null;
	this.regexp = null;

	this.keys = path.match(RES_PARAM_REGEX) || [];

	//a slash is added to the regex after the path (if it is already there) so '/a/b/c' won't match '/a/b/cdefg'.
	var pathSlashRegexAddition = (path[path.length-1] == '/') ? '' : '\\/'; 
	
	if (this.keys !== null) {
		for (var i=0 ; i<this.keys.length ; i++) {
			this.keys[i] = this.keys[i].slice(2);		//cut out '/:'
		}
		this.regexp = RegExp(	'^(' + 
								this.escapeRouteChars(path).replace(RES_PARAM_REGEX,RES_PARAM_PHOLDER) + 
								')(' + pathSlashRegexAddition + '.*)?$','i');
	} else {
		this.regexp = RegExp(	'^(' + this.escapeRouteChars(path) + 
								')(' + pathSlashRegexAddition + '.*)?$','i');
	}
}

Route.prototype.escapeRouteChars = function (r) {
	return r.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

Route.prototype.fixUsePath = function (p) {
	// adds a '/' to the path if it doesn't start with a '/', and removes trailing '/'.
	if (p.length > 0) {
		if (p.charAt(0) !== '/') {
			p = '/' + p;
		}
		if (p.length > 1 && p[p.length-1]==='/') {
			p = p.slice(0,-1);
		}
	} else {
		p = '/';
	}
	return p;
};

Route.prototype.match = function (res) { 	//returns true if the resource matches the regex.
	return !!this.regexp.exec(res);
};


//#############################################################################
//#############################################################################
//############################  R E Q U E S T  ################################
//#############################################################################
//#############################################################################

function expRequest(incomingMessage) {  
	// miniHttp.IncomingMessage.call(this);
	//prototype fields: socket,methodName,path,httpVersion,reqHeaders,reqBody,keepAlive.
	for(var prop in incomingMessage) {
		this[prop] = incomingMessage[prop];
	}

	//default values:
	this.params = {};
	this.query = {};
	this.body = {};
	this.cookies = {};
	this.path = this.reqPath;

	//init. path, host, protocol, query. (params is updated according to the route):
	this.protocol = 'http'; //no HTTPS support yet ;)
	this.host = this.reqHeaders['host'] || '';
	this.host = this.host.replace(/:\d+$/,'');
	if (this.path.indexOf('?') === -1) {
		this.path = this.path.slice(this.path.indexOf('/'));
	} else {
		var queries = this.path.slice(this.path.indexOf('?')+1);
		this.path = this.path.slice(this.path.indexOf('/'), this.path.indexOf('?'));
		//parse query:
		queries = queries.split('&');
		for (var i = 0; i < queries.length ; i++) {
			var query = queries[i].split('=');
			if (query[0].indexOf('[') !== -1 && query[0].indexOf(']') !== -1) {
				var subQuery = query[0].slice(query[0].indexOf('[')+1,query[0].indexOf(']'));
				query[0] = query[0].slice(0,query[0].indexOf('['));
				this.query[query[0]] = this.query[query[0]] || {};			
				this.query[query[0]][subQuery] = query[1];			
			} else {
				this.query[query[0]] = query[1];
			}
		}
	}
}
expRequest.prototype = Object.create(miniHttp.IncomingMessage.prototype);

expRequest.prototype.get = function (field) {
	field = field.toLowerCase();
	if (field === 'referer' || field === 'referrer') {
		return this.reqHeaders['referer'] || this.reqHeaders['referrer'];
	} else {
		return this.reqHeaders[field];
	}
};

expRequest.prototype.param = function (name) {
	if (this.params[name] !== undefined) {
		return this.params[name];
	}
	if (this.body[name] !== undefined) {
		return this.body[name];
	}
	if (this.query[name] !== undefined) {
		return this.query[name];
	}
	return undefined; //in case no such param exists.
};

expRequest.prototype.is = function (type) {
	var ctype = this.get('content-type');
	if (!ctype) {
		return false;
	}
	ctype = ctype.split(';')[0];  //to remove charsets, etc.

	var type_parts = type.split('/');
	var ctype_parts = ctype.split('/');
	if (type_parts.length === 1) {
		return (type_parts[0] === ctype_parts[1]);
	} else {
		if (type_parts[0] !== ctype_parts[0]) {
			return false;
		} else {
			if (type_parts[1] === '*') {
				return true;
			} else {
				return (type_parts[1] === ctype_parts[1]);
			}
		}
	}
};


//#############################################################################
//#############################################################################
//############################  R E S P O N S E ###############################
//#############################################################################
//#############################################################################

function expResponse(serverResponse) { 
	// miniHttp.ServerResponse.call(this);
	//prototype fields: statusCode,statusPhrase,socket,httpVersion,headers,keepAlive.
	for(var prop in serverResponse) {
		this[prop] = serverResponse[prop];
	}

	this.finishedRoutes = false;
}
expResponse.prototype = Object.create(miniHttp.ServerResponse.prototype);

expResponse.prototype.status = function (code) {
	this.statusCode = code;
	return this;
};

expResponse.prototype.get = function (field) {
	return this.getHeader(field);
};

expResponse.prototype.set = function(field, value) {
	if (arguments.length == 2) {
		if (Array.isArray(value)) {
			value = value.map(String);
		} else {
			value = String(value);
		}
		this.setHeader(field,value);
	} else { //1 OBJECT arg:
		for (var f in field) {
			this.set(f,field[f]);
		}
	}
	return this;
};

expResponse.prototype.send = function (body) { /* [status,] body */
	if (arguments.length == 2) {
		if (typeof body == 'number') {
			this.statusCode = body;
			body = arguments[1];
		} else {
			this.statusCode = arguments[1];
		}
	}

	if (typeof body == 'number') {
		this.statusCode = body;
		body = HTTP_ERROR_DESCRIPTION[body] || '';
	} else if (typeof body == 'string') {
		if (this.get('content-type') == undefined) {
			this.set('content-type','text/html');
		}
	} else if (typeof body == 'object') { //including array.
		if (body == null) {
			body = '';
		} else if (Buffer.isBuffer(body)) {
			if (this.get('content-type') == undefined) {
				this.set('content-type','application/octet-stream');
			}
		} else { //non-null object/array.
			return this.json(body);
		}
	}

	// Content-Length:
	if (body === undefined) {
		body = '';
	}

	var clen = body.length;
	if (!this.get('content-length') && clen >= 0) {
		this.set('content-length', clen);
	}

	this.finishedRoutes = true; // ## no more routing after send() / json(). ##
	this.end(body); //writes header as well.
	return this;
};

expResponse.prototype.json = function(body) {
	if (arguments.length == 2) {
		if (typeof body == 'number') {
			this.statusCode = body;
			body = arguments[1];
		} else {
			this.statusCode = arguments[1];
		}
	}

	body = JSON.stringify(body);
	if (this.get('content-type') == undefined) {
		this.set('content-type','application/json');
	}

	this.finishedRoutes = true; // ## no more routing after send() / json(). ##
	return this.send(body);
};

expResponse.prototype.cookie = function (name,val,options) {
	options = options || {};

	if (typeof val == 'number') {
		val = val.toString();
	} else if (typeof val == 'object') {	//including array
		val = '' + JSON.stringify(val);
	}

	if (options.path === undefined) {
		options.path = '/';		//default path
	} 

	var cookieStr = String(name + '=' + val);

	if (options.maxAge !== undefined) {	//in expressL maxAge is in ms. in HTTP: in seconds.
		options.expires = new Date(Date.now() + options.maxAge);
		options.maxAge /= 1000; //ms -> secs.
	}

	for (var opt in options) {
		if (typeof options[opt] == 'boolean') {
			if (options[opt] == true) {
				cookieStr = cookieStr + '; ' + opt;
			}
		} else {
			if (opt.toLowerCase() == 'expires') {
				options[opt] = options[opt].toUTCString();
			}
			cookieStr = cookieStr + '; ' + opt + '=' + String(options[opt]);
		}
	}

	this.set('set-cookie', cookieStr);
};


//#############################################################################
//#############################################################################
//#########################  M I D D L E W A R E S ############################
//#############################################################################
//#############################################################################

var path = require('path');
var fs = require('fs');

var ERR_INTERNAL_SERVER_ERROR 	= 500;
var ERR_METHOD_NOT_ALLOWED		= 405;
var ERR_NOT_FOUND				= 404;
var ERR_FORBIDDEN				= 403;

/* descriptions for relevant error codes: */
var HTTP_ERROR_DESCRIPTION = { 	
	'500' : 'Error 500 - Internal Server Error: \nrequest isn\'t a legal HTTP Request.' + 
						'\nMake sure an HTTP1.1 request has a Host header.',
	'405' : 'Error 405 - Method Not Allowed: \nexpecting GET requests only.',
	'404' : 'Error 404 - Not Found: \nrequested resource couldn\'t be located on the server.',
	'403' : 'Error 403 - Forbidden: \nyou are not authorized to view the requested file.'  };

var CONTENT_TYPES = {	'html' 	: 'text/html',
						'txt'	: 'text/plain',
						'js'	: 'application/javascript',
						'css'	: 'text/css',
						'jpg'	: 'image/jpeg',
						'jpeg'	: 'image/jpeg',
						'gif'	: 'image/gif'	};

exports.static = function (rootFolder) {
	return function staticMiddleware(req,resp,next) {
		/* only supporting GET for static requests: */
		if(req.methodName.toLowerCase() !== 'get') { 
			// resp.status(ERR_METHOD_NOT_ALLOWED).send(errStr(ERR_METHOD_NOT_ALLOWED)); 
			return next();
		}

		/* resolve path and get file, handling directory traversal */
		var dataPath = req.path.replace(next.matchedPath,'');
		dataPath = path.join(rootFolder, dataPath);
		dataPath = path.normalize(dataPath);

		fs.realpath(dataPath, function (err, resolvedPath) { // async. resolve path.
			if (err) {	// error resolving path, file doesn't exist.
				//resp.status(ERR_NOT_FOUND).send(errStr(ERR_NOT_FOUND)); 
				//file not found - try next handler. if none match - will send 404.
				return next();
			} 

			if (path.relative(rootFolder,resolvedPath).indexOf('..') !== -1) {
				// resource isn't in the root directory (directory traversal).
				resp.status(ERR_FORBIDDEN).send(errStr(ERR_FORBIDDEN)); 
				return next();
			}

			fs.stat(resolvedPath, function (err2, stats) {
				if(err2) {
					// shouldn't happen - try next handler.
					return next();
				}
				if (stats.isFile()) { 	// send the resource in a 200 HTTP respond
					// async. write response to socket:
					fs.readFile(resolvedPath, function (err2,data) {
						if (err2) {
							// shouldn't happen - try next handler.
							return next();
						}
						var ctype = getContentType(resolvedPath);
						if (ctype !== undefined && resp.get('content-type') == undefined) {
							resp.set('content-type',ctype);
						}
						resp.send(data);	//sends header (with set content-length/type) as well.
						return next();
					});
				} else {
					resp.status(ERR_NOT_FOUND).send(errStr(ERR_NOT_FOUND)); 
					return next();
				}
			});
		});

		function getContentType(path) {
			var contentType;
			var ctype = path.slice(path.lastIndexOf('.')+1); //file extension
			if (CONTENT_TYPES.hasOwnProperty(ctype) === true) {
				contentType = CONTENT_TYPES[ctype];  //otherwise: stays undefined...
			}
			return contentType;
		}

		function errStr(errCode) {	//response.send(string) -> sets type: text/html.
			if (HTTP_ERROR_DESCRIPTION[errCode] !== undefined) {
				return 	'<html><head><title>Error</title></head><body>' + 
						'<h1>Error ' + errCode + '</h1><br />' +
						HTTP_ERROR_DESCRIPTION[errCode] + '</body></html>';	
			} else {
				return 	'<html><head><title>Error</title></head><body>' + 
						'<h1>Error ' + errCode + '</h1></body></html>';
			}
		}
	};
};


exports.cookieParser = function () {
	return function cookieParserMiddleware(req,resp,next) {
		var cookies = req.get('cookie') || [];
		if (Array.isArray(cookies)) {
			for (var i = 0; i < cookies.length; i++) {
				handleCookies(cookies[i]);
			}
		} else {
			handleCookies(cookies);
		}
		return next();

		function handleCookies(cookiesStr) {	//cookieStr format: a=x;b=y;c=z
			var cookieArr = cookiesStr.split(/;\s*/);
			var cookie;
			for(var j = 0; j < cookieArr.length; j++) {
				cookie = cookieArr[j].split('=');
				req.cookies[cookie[0]] = cookie[1];
			}
		}
	};
};


exports.json = function () {
	return function jsonMiddleware(req,resp,next) {
		try {
			req.body = JSON.parse(req.reqBody);
		} catch (e) {
			// console.log('Parsing error. body isn\'t json.');
		} finally {
			next();
		}
	};
};


exports.urlencoded = function () {
	return function urlencodedMiddleware(req,resp,next) {
		if (req.is('application/x-www-form-urlencoded')) {
			var arr = req.reqBody.split('&');
			var param;
			for (var i = 0; i < arr.length; i++) {
				param = arr[i].split('=');
				req.body[param[0]] = param[1];
			}
		} 
		return next();
	};
};


exports.bodyParser = function () {
	var jsonMware = exports.json();
	var urlencodedMware = exports.urlencoded();

	return function bodyParserMiddleware(req,resp,next) {
		jsonMware(req,resp, function () {
			urlencodedMware(req,resp,next);
		});
	}
};