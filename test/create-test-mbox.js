'use strict';

var stream = require('stream'),
	mailcomposer = require('mailcomposer'),
	lipsum = require('lorem-ipsum'),
	marked = require('marked'),
	_ = require('lodash'),
	MboxStream = require('./MboxStream');

function create_message() {
	var txt = lipsum({
		count: 5,
		units: 'paragraphs',
		format: 'plain'
	});

	var msg = mailcomposer({
		from: 'John Doe <john@example.com>',
		to: 'Jane Doe <jane@example.com>',
		subject: txt.split('.')[0],
		text: txt,
		html: marked(txt)
	});

	return msg;
}

var mb = new MboxStream();

mb.pipe(process.stdout);

for (var i=0; i<10; i++) {
	mb.add(create_message());
}