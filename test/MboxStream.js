'use strict';

var stream = require('stream'),
	util = require('util'),
	_ = require('lodash'),
	strftime = require('strftime'),
	mimelib = require('mimelib'),
	FromQuote = require('./FromQuote'),
	fmt = require('util').format;

util.inherits(MboxStream, stream.Readable);

function MboxStream(options) {
	if (!(this instanceof MboxStream))
		return new MboxStream(options);
	
	stream.Readable.call(this, options);
	
	this._queue = [];
	this._ended = false;
	this._processing = false;
}

MboxStream.prototype.add = function (msg) {
	this._queue.unshift(msg);
};

MboxStream.prototype._process = function () {
	if (this._processing)
		return;

	var self = this;
	this._processing = true;

	if (this._queue.length) {
		var msg = this._queue.pop();
		var _headers = _(msg._headers);

		var from = _headers.filter({'key': 'From'}).pluck('value').value()[0];
		from = mimelib.parseAddresses(from)[0]['address'];
		var date = strftime('%a %b %d %H:%M:%S %Z %Y', msg.date);
		
		var fq = new FromQuote();
		msg.createReadStream().pipe(fq);
		self.push(fmt('From %s %s\r\n', from, date))
		fq.on('data', function (buf) {
			self.push(buf);
		});
		fq.on('end', function () {
			self._processing = false;
			self._process();
		});
		fq.on('error', function (err) {
			this.emit('error', err);
		});
	}
};

MboxStream.prototype._read = function (size) {
	this._process();
};

module.exports = MboxStream;