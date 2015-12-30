'use strict';

var handlebars = require('handlebars'),
	typogr = require('typogr');

handlebars.registerHelper('smarty', function (str) {
	var safe = handlebars.escapeExpression(str);
	return new handlebars.SafeString(typogr.smartypants(safe));
});