'use strict';

var path = require('path');

var rePosixSep = new RegExp(path.posix.sep, 'g');

function posix_escape(str) {
	return str.replace(rePosixSep, '\\$&');
}

module.exports = {
	posix_escape: posix_escape
};