var stream = require('stream'),
	util = require('util'),
	fmt = require('util').format;

util.inherits(FromQuote, stream.Transform);

function stringStartsWith (string, prefix) {
    return string.slice(0, prefix.length) == prefix;
}



function FromQuote (options) {
	if (!(this instanceof FromQuote))
		return new FromQuote(options);
	
	stream.Transform.call(this, options);
	
	this._rest = '';
	this._reFromLine = /(^>*From )/;
}

FromQuote.prototype._transform = function (chunk, encoding, next) {
	var str = this._rest + chunk.toString();
	var lines = str.split('\n');

	this.rest = lines.pop();
	
	for (var i=0, n=lines.length; i<n; i++) {
		var line = lines[i];
		if (this._reFromLine.test(line)) {
			line = '>' + line;
		}
		
		this.push(line + '\n');
	}
	
	next();
};

FromQuote.prototype._flush = function (done) {
	this.push(this.rest + '\n');
	done();
}

module.exports = FromQuote;