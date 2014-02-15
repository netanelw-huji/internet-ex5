//#############################################################################
//#############################################################################
//###########################  P A R S E R  ###################################
//#############################################################################
//#############################################################################

/* 	newline is implemented with or without carriage-return in different OSs.
	a newline should not be followed by a tab/space, otherwise it's the same
	http header. */
var CRLF 			= /\r?\n(?![\t ])/; //newline that cannot appear mid-header
var CRLF_SAMELINE 	= /\r?\n[\t ]+/; 	//newline that can appear mid-header
var CRLFCRLF 		= /\r?\n\r?\n/; 	//seperates headers from (opt.) msg body.
var HTTP_VERSION_REGEX 	= /HTTP\/\d\.\d/; 	//HTTP version pattern: HTTP/x.x
var LEADING_WHITESPACES		= /^[\t ]+/;
/* constants for http request structure for parser */
var HTTP_NUM_CHUNKS 		= 2;
var CHUNK_HEADERS 			= 0;
var CHUNK_BODY 				= 1;
/* constants for http request header structure for parser */
var HEADER_NUM_PARTS 		= 2;
var HEADER_NAME 			= 0;
var HEADER_VALUE 			= 1;
var HEADER_DELIM 			= ':';
/* constants for request initial line structure for parser */
var INITIAL_REQ_LINE 		= 0;
var INITIAL_LINE_DELIM 		= ' ';
var INITIAL_LINE_NUM_PARTS 	= 3;
var INITIAL_LINE_METHOD 	= 0;
var INITIAL_LINE_PATH 		= 1;
var INITIAL_LINE_VERSION 	= 2;


/* header name comparison should be case-insensitive */
/* only included several more-important headers */
var LEGAL_HTTP_HEADERS = [	'from',					'host',
							'if-modified-since',	'if-unmodified-since', 	
							'max-forwards',			'referer', 	
							'accept-charset',		'accept',
							'accept-encoding',		'accept-language',	
							'user-agent', 			'content-length',
							'content-type' ,		'connection', 			
							'date',					'transfer-encoding', 	
							'via',					'last-modified', 
							'cookie', 				'set-cookie' ];

/* method name comparison should be case-sensitive */
var LEGAL_HTTP_METHODS = [	'OPTIONS',	
							'GET',
							'HEAD',
							'POST',
							'PUT',
							'DELETE',
							'TRACE',
							'CONNECT'  ];


/* Exception thrown when the parsed message isn't a valid HTTP request */
function NonHttpError() {
	this.name = "NonHttpError";
	this.message = "Parsed message isn't a legal HTTP request.";
} 
NonHttpError.prototype = new Error();
exports.NonHttpError = NonHttpError;


function Parser (socket) {
	var req;

	this.parse = function (msg) {
		// console.log(msg);
		req = new IncomingMessage(socket);
		// req.socket = socket;

		var chunks = msg.split(CRLFCRLF);

		// handle the (opt) body. if GET method - body (usually) empty.
		if (chunks.length < HTTP_NUM_CHUNKS) {
			throw new NonHttpError();
		} else {
			if (chunks.length > HTTP_NUM_CHUNKS) { //if there's CRLFCRLF in body
				chunks[CHUNK_BODY] = chunks.slice(CHUNK_BODY).join("\r\n\r\n");
				chunks.length = HTTP_NUM_CHUNKS;
			}
			req.reqBody = chunks[CHUNK_BODY];
		}

		// handle the initial request line: 
		var lines = chunks[CHUNK_HEADERS].split(CRLF);
		parseInitialRequestLine(lines[INITIAL_REQ_LINE]);

		// handle request headers:
		lines.shift(); //removes lines[0] from the array. leaves header lines.
		lines.forEach(function (hdr) {
			parseHeader(hdr);
		});

		if (isLegalHTTPRequest(req) === false) {
			throw new NonHttpError();
		} else {
			req.keepAlive = checkKeepAlive(req);
			return req;
		}	
	};

	function parseInitialRequestLine(reqline) {
		var parts = reqline.split(INITIAL_LINE_DELIM); //split by single-space.

		if (parts.length !== INITIAL_LINE_NUM_PARTS) { //exactly 3 parts
			throw new NonHttpError();
		}

		// handle method name:
		if (isLegalMethodName(parts[INITIAL_LINE_METHOD]) === false) {
			throw new NonHttpError();
		} else {
			req.methodName = parts[INITIAL_LINE_METHOD];
		}

		// handle path:
		req.reqPath = parts[INITIAL_LINE_PATH]; // handled while resolving path.

		// handle version: 
		if (HTTP_VERSION_REGEX.test(parts[INITIAL_LINE_VERSION]) === false) {
			throw new NonHttpError();
		} else {
			req.httpVersion = parts[INITIAL_LINE_VERSION];
		}

	}

	function parseHeader(hdr) {
		hdr = hdr.replace(CRLF_SAMELINE, ' ');

		var parts = hdr.split(HEADER_DELIM);
		if (parts.length < HEADER_NUM_PARTS) {
			throw new NonHttpError();
		} else {
			if (parts.length > HEADER_NUM_PARTS) { //if there's ':' in value
				parts[HEADER_VALUE] = parts.slice(HEADER_VALUE).join(HEADER_DELIM);
				parts.length = HEADER_NUM_PARTS;
			}
		}

		parts[HEADER_VALUE] = parts[HEADER_VALUE].replace(LEADING_WHITESPACES,''); //remove leading spaces
		parts[HEADER_NAME] = parts[HEADER_NAME].toLowerCase();
		if (isLegalHeaderName(parts[HEADER_NAME]) === true) {
			req.reqHeaders[parts[HEADER_NAME]] = parts[HEADER_VALUE];
		}	//	else: ignore header.
	}

	function isLegalHeaderName(name) { /* expecting name to be lowercase */
		//name = name.toLowerCase(); //case-insensitive comparison
		for (var i = 0 ; i < LEGAL_HTTP_HEADERS.length ; i++) {
			if (LEGAL_HTTP_HEADERS[i] === name) {	//case-sensitive compare.
				return true;
			}
		}
		return false;
	}

	function isLegalMethodName(method_name) { //method_name should be uppercase
		for (var i = 0 ; i < LEGAL_HTTP_METHODS.length ; i++) {
			if (LEGAL_HTTP_METHODS[i] === method_name) {	//case-sensitive compare.
				return true;
			}
		}
		return false;
	}

	// checks:
	// 1. if HTTP version is 1.1: having a 'host' header.
	// 2. if a body exists: having a content-length header.
	function isLegalHTTPRequest(req) {
		//parse host from path in case it doesn't start with '/'.
		if (req.reqPath[0] !== '/' && req.reqPath.indexOf('//') !== -1) {
			//the host is implicitly included in the request path.
			var hostStartIndex = req.reqPath.indexOf('/',req.reqPath.indexOf('//')+2/*'//' length*/);
			req.reqHeaders['host'] = req.reqPath.slice(req.reqPath.indexOf('//')+2,hostStartIndex);
			req.reqPath = req.reqPath.slice(hostStartIndex);
		}

		if (req.httpVersion === 'HTTP/1.1') {
			if (req.reqHeaders['host'] === undefined) {
				return false;
			} 
		}
		if (req.reqBody.length > 0) {
			if (req.reqHeaders['content-length'] === undefined) {
				return false;
			}
		}
		return true;
	}

	// checks if the socket need to be closed after the response:
	function checkKeepAlive(req) {
		if (req.httpVersion === 'HTTP/1.0') {
			if(req.reqHeaders['connection'] !== undefined) {
				if (req.reqHeaders['connection'].toLowerCase() === 'keep-alive') {
					return true;
				}
			}
			return false;
		}
		if(req.reqHeaders['connection'] !== undefined) {
			if (req.reqHeaders['connection'].toLowerCase() === 'close') {
				return false;
			}
		}
		return true;
	}
}
exports.Parser = Parser;


//#############################################################################
//#############################################################################
//############################  R E Q U E S T  ################################
//#############################################################################
//#############################################################################

// var httpResponse = require('./httpResponse');
var path = require('path');
var fs = require('fs');

function IncomingMessage(socket) {
	this.socket = socket;

	this.methodName = '';
	this.reqPath = '';
	this.httpVersion = '';
	this.reqHeaders = {};
	this.reqBody = '';

	this.keepAlive = true;
}
exports.IncomingMessage = IncomingMessage;

IncomingMessage.prototype.toString = function () {
	var str = this.methodName + ' ' + this.reqPath + ' ' + this.httpVersion + '\r\n';
	for (hdr in this.reqHeaders) {
		str += hdr + ': ' + this.reqHeaders[hdr] + '\r\n';
	}
	str += '\r\n';
	str += this.reqBody;
	return str;
};


//#############################################################################
//#############################################################################
//############################  R E S P O N S E ###############################
//#############################################################################
//#############################################################################

var fs = require('fs');


/* some error codes included for future use */
var HTTP_RESPOND_STATUS = {	'100' : 'Continue',
							'200' : 'OK',
							'304' : 'Not Modified',
							'400' : 'Bad Request',
							'401' : 'Unauthorized',
							'403' : 'Forbidden',
							'404' : 'Not Found',
							'405' : 'Method Not Allowed',
							'500' : 'Internal Server Error'	};


var HTTP_VERSION		= "HTTP/1.1";
var HDR_DATE 			= 'Date';
var HDR_CONTENT_TYPE 	= 'Content-Type';
var HDR_CONTENT_LEN 	= 'Content-Length';
var CRLF_RESP 	= '\r\n';
var SP 		 	= ' ';
var HDR_DELIM	= ': ';



function ServerResponse(req) {
	this.statusCode = 200; //default.
	this.statusPhrase = '';
	this.socket = req.socket;
	this.httpVersion = HTTP_VERSION;
	this.headers = {};
	this.keepAlive = req.keepAlive;
	this.sentHeader = false;
}
exports.ServerResponse = ServerResponse;

ServerResponse.prototype.writeHead = function (statusCode) { /* statusCode [, phrase][, headers] */
	this.statusCode = statusCode;

	if (arguments[1] == 'string') {
		this.statusPhrase = arguments[1];
		if(arguments[2] != undefined) {
			this.headers = arguments[2];
		}
	} else {
		this.statusPhrase = HTTP_RESPOND_STATUS[statusCode] || '';
		if(arguments[1] != undefined) {
			headers = arguments[1];
		}
	}
	//sending initial response line:
	this.socket.write(	this.httpVersion + 
					SP +
					this.statusCode + 
					SP +
					this.statusPhrase +
					CRLF_RESP   );
	//set date header:
	if(this.getHeader('date') === undefined) {
		this.setHeader('date',new Date().toUTCString());
	}
	//sending headers:
	for (hdr in this.headers) {
		if (hdr === 'set-cookie') {	
			//seperate the array in case of set cookies (multiple values for a single header)
			for (var i = 0 ; i < this.headers[hdr].length ; i++) {
				this.socket.write(	hdr + 
									HDR_DELIM + 
									this.headers[hdr][i] + 
									CRLF_RESP   );
			}
		} else {
			this.socket.write(	hdr + 
								HDR_DELIM + 
								this.headers[hdr] + 
								CRLF_RESP   );
		}
	}
	//sending another newline, making it a separating double-newline.
	this.socket.write(CRLF_RESP);
	this.sentHeader = true;
};

ServerResponse.prototype.write = function (chunk) {
	if (this.sentHeader == false) {
		this.writeHead(this.statusCode);
	}

	if (chunk.length === 0) {
		return true;
	}

	if (chunk instanceof Buffer) {
		chunk = chunk.toString();
	}

	var ret = this.socket.write(chunk);
	return ret;
};

ServerResponse.prototype.end = function (data) {
	if (this.sentHeader == false) {
		this.writeHead(this.statusCode);
	} 

	if (data === undefined) {
		if (this.keepAlive == false) {
			this.socket.end();
		}
	} else {
		this.socket.write(data);
		if (this.keepAlive == false) {
			this.socket.end();
		}
	}
}

ServerResponse.prototype.setHeader = function (name, value) {
	if(name.toLowerCase() !== 'set-cookie') {
		this.headers[name.toLowerCase()] = value;
	} else {	//allow multiple set-cookies as an array:
		if (this.headers['set-cookie'] === undefined) {
			this.headers['set-cookie'] = [];
		}
		this.headers['set-cookie'].push(value);
	}
};

ServerResponse.prototype.getHeader = function (name) {
	return this.headers[name.toLowerCase()];
};

ServerResponse.prototype.removeHeader = function (name) {
	delete this.headers[name.toLowerCase()];
};


//#############################################################################
//#############################################################################
//##############################  S E R V E R  ################################
//#############################################################################
//#############################################################################

var events = require('events');
var net = require('net');

function Server(requestListener) {
	events.EventEmitter.call(this);

	var self = this;

	this.on('request', requestListener);

	this.netServer = net.createServer( function (socket) {
		var buf = '';
		var readingBody = false;
		var bodySize = 0;
		var req; 	//parsed request object

		socket.on('data', function(data) {
			buf += data; 

			if(readingBody === false) {		//reading header
				var headSep = buf.search(CRLFCRLF);	//double newline separating head from body.

				if (headSep != -1) {
					// check if newline uses CR, i.e. \n\n (2 bytes) or \r\n\r\n (4 bytes). 
					var headSepLen = 4; 
					if (buf.substring(headSep,headSep+4) !== '\r\n\r\n') { 
						headSepLen = 2;
					}
					var msgHead = buf.slice(0,headSep+headSepLen); // entire msg head, no body
					buf = buf.slice(headSep+headSepLen); // removing msg head from buf

					// parse msg head and see if a body exists (looking for 'content-length' header)
					try {
						var p = new Parser(socket);
						req = p.parse(msgHead);
						if (req.reqHeaders['content-length'] !== undefined) { 	//header exists
							bodySize = Number(req.reqHeaders['content-length']);
							if (bodySize > 0 && buf.length < bodySize) {
								readingBody = true;
							} else if (bodySize > 0 && buf.length >= bodySize) {	
								//all the data is already in buf:
								readingBody = true;
								this.emit('data','');
							}
						} else {  
							/* 	##  BY HERE WE HAVE THE ENTIRE MESSAGE 	##
								##  IF IT DOESN'T HAVE A BODY. (in req)	## */
							var resp = new ServerResponse(req);
							self.emit('request',req,resp);
						}
					} catch(e) {
						var resp = new ServerResponse(new IncomingMessage(socket));
						var errStr = 	'<html><head><title>Error</title></head><body>' + 
										'<h1>Error 500</h1><br />Internal Server Error: ' + 
										'\nrequest isn\'t a legal HTTP Request.' + 
										'\nMake sure an HTTP1.1 request has a Host header.</body></html>';
						resp.statusCode = '500';
						resp.setHeader('content-length',errStr.length);
						resp.setHeader('content-type','text/html');
						resp.end(errStr);
					}
				} else {
					return;		// wait for next data event for more bytes to come..
				}
			} else {	//reading body (if exists):
				if (buf.length >= bodySize) {
					req.reqBody = buf.slice(0,bodySize);
					buf = buf.slice(bodySize); // delete prev msg body from buf.
					readingBody = false;
					/* 	## 	BY HERE WE HAVE THE ENTIRE MESSAGE	## 
						##	IF IT DOES HAVE A BODY. (in req)	## */
					var resp = new ServerResponse(req);
					self.emit('request',req,resp);
				} else {
					return;  // wait for next data event for more bytes to come...
				}
			}
		});

		socket.on('error', function (e) {
			console.log('Error occured: ' + e.message);
			if (socket.writable === false) {
				console.log('Socket is only half-open, ignoring received data.');
			}
		});
	});


	this.timeout = 2 * 60 * 1000; //default timeout, 2 mins
}
Server.prototype = Object.create(events.EventEmitter.prototype);

Server.prototype.listen = function () { /* port[, cb] */
	var port, cb;
	if (arguments.length > 2 || arguments.length <= 0) {
		console.log("listen parameters: port[, callback].");
	} else {
		port = arguments[0];
		if (isNaN(port) == true) {
			console.log('Error: Server.listen\'s port should be a number!');
			return;
		}
		if (arguments.length === 2) {
			cb = arguments[1];
			if (typeof cb != 'function') {
				console.log('Error: Server.listen\'s callback should be a function!');
				return;
			}
			console.log('Server listening on port ' + port + '. Rock \'n\' Roll.');
			this.netServer.listen(port,cb);
		} else {
			console.log('Server listening on port ' + port + '. Rock \'n\' Roll.');
			this.netServer.listen(port);
		}
	}
	return this;
};

Server.prototype.close = function (cb) {
	if(cb) {
		this.netServer.on('close',cb);
	}
	this.netServer.close();
	this.netServer = null;
	return this;
};

Server.prototype.setTimeout = function (msecs, cb) {
	this.timeout = msecs;
	if (cb) {
		this.on('timeout', cb);
	}
};

exports.createServer = function (requestListener) {
	return new Server(requestListener);
};

