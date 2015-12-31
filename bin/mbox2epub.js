#!/usr/bin/env node
'use strict';

var Mbox2Epub = require('../'),
	getopt = require('node-getopt'),
	printf = require('printf'),
	_ = require('lodash');


//todo: custom helptext, explaining use of bare mbox args
var opts = getopt.create([
	['m' , 'mbox=PATH+'			, 'mbox to parse (defaults to stdin)'],
	['o' , 'out=PATH'			, 'output path (defaults to stdout)'],
	['t' , 'title=STRING'		, 'publication title'],
	['a' , 'author=STRING'		, 'publication author'],
	['s' , 'subject=STRING+'	, 'subject/category tag'],
	[''  , 'uuid=ID'			, 'publication unique ID (e.g. UUID, ASIN, ISBN, ISSN) (defaults: random UUID)'],
	[''  , 'language=LANG'		, 'publication language'],
	[''  , 'description=STRING'	, 'publication description/summary'],
	[''  , 'rights=STRING'		, 'copyleft/right statement'],
	[''  , 'date=DATE'			, 'publication date (defaults to last date of message in mbox)'],
	[''  , 'cover=PATH'			, 'path or URL to cover image (not implemented)'],
	[''  , 'use-text'			, 'force use of text/plain message part even if text/html is present'],
	[''  , 'strip-background-images'	, 'remove background and background-image inline styles'],
	[''  , 'flatten-tables'		, 'convert tables to divs for readers that can\'t handle them'],
	['h' , 'help'				, 'display this help'],
	['v' , 'version'			, 'show version'], // todo: implement version string
	['V' , 'verbose'			, 'verbose logging to stderr']
]).bindHelp().parseSystem();

var config = opts.options;
var mboxes = null;

//todo: replace with real logging
function carp(msg) {
	console.error(msg);
}

function kvetch(msg) {
	if (config.verbose)
		console.error(msg);
}

function die(msg) {
	carp(msg);
	process.exit(-1);
}

var reHyphen = /-/g;

function shellopt_to_jsopt(v) {
	v[0] = v[0].replace(reHyphen, '_');
	if (_.isUndefined(v[1]))
		v[1] = true;
	return v;
}

var params = _(opts.options)
			.pick(['uuid', 'title', 'language', 'author', 'description', 'rights',
				'cover', 'strip-background-images', 'flatten-tables', 'use-text',
				'verbose']) //todo: backport "verbose" into lib
			.pairs().map(shellopt_to_jsopt).zipObject()
			.value();

if (config.subject)
	params.subjects = config.subject;

if (config.date) {
	var d = new Date(config.date);
	if (d instanceof Date && isFinite(d))
		params.date = d;
}

if (config.mbox)
	mboxes = config.mbox;
else if (opts.argv.length)
	mboxes = opts.argv;
else
	kvetch('No input specified, using STDIN.');

kvetch(opts);
kvetch(params)
kvetch(mboxes);

var epub = new Mbox2Epub(params);

function write_epub() {
	if (config.out)
		epub.write(config.out, function (err) {
			if (err)
				die(err);
			else
				kvetch(printf('EPUB saved to %s', config.out));
		});
	else
		epub.stream().pipe(process.stdout);
}

function add_mboxes(err) {
    if (err)
        die(err);
	else if (mboxes.length)
        epub.add(mboxes.shift(), add_mboxes);
    else
        write_epub();
}

if (mboxes) {
	add_mboxes();
} else {
	kvetch('Reading mbox from STDIN');
	epub.add(process.stdin, function (err) {
		if (err)
			die(err);
		else
			write_epub();
	});
}




