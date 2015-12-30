var Mbox = require('node-mbox'),
	Cheerio = require('cheerio'),
	MailParser = require('mailparser').MailParser,
	EpubGenerator = require('epub-generator'),
	handlebars = require('handlebars'),
	fs = require('graceful-fs'),
	printf = require('printf'),
	fmt = require('util').format,
	marked = require("marked"),
	path = require('path'),
	_ = require('lodash'),
	
	path_tools = require('./path_tools'),
	html_tools = require('./html_tools');

// dynamic files
var TEMPLATES = {
	chapter: handlebars.compile(fs.readFileSync(path.join(__dirname, 'templates', 'chapter.html')).toString('utf8'))
	};


function build_html(msg, options) {
	// todo: better mime structure handling
	var hasHtml = (!! msg.html);

	var body = options.use_text || ! hasHtml
				? marked(msg.text)
				: html_tools.clean(msg.html, options);

	var params = {
		title: msg.subject,
		body: body
	};
	
	return TEMPLATES['chapter'](params);
}

function Mbox2Epub(opts, cb) {
	var options = _.merge({}, Mbox2Epub.defaults, opts);
	
	var generator_props = ['uuid', 'title', 'language', 'author',
							'description', 'rights', 'date', 'cover'];
	var build_props = ['use_text', 'strip_background_images'];
	
	var messages = [];
	
	var self = this;

	this.stream = function() {
		var last_msg = messages[messages.length - 1];

		var epub_options = _.pick(options, generator_props);
		epub_options.date = last_msg.date;

		var epub = new EpubGenerator(epub_options);
	
		var digits = Math.ceil(Math.log10(messages.length + 1));
		var fn_spec = printf('%%0%dd - %%s.html', digits);

		for (var i=0, n=messages.length; i<n; i++) {
			var msg = messages[i];
			console.log(fmt('Found %s (%s)', msg.subject, msg.date));
		
			var body = build_html(msg, _.pick(options, build_props));
			var path = printf(fn_spec, i + 1,
						path_tools.posix_escape(msg.subject));

			epub.add(path, body, {
				mimetype: 'application/xhtml+xml',
				toc: true,
				title: msg.subject
				});
		}
	
		epub.end();
		
		return epub;
	};

	this.write = function(path, cb) {
		// todo: catch errors
		var epub = self.stream();
		var out = fs.createWriteStream(path);
		epub.pipe(out);
		cb && out.on('finish', cb);
	};

	// todo: queueing to allow rapid-fire of .add()
	this.add = function (mb /*path, string, or stream*/, cb) {
		var mbox = new Mbox(mb, {encoding: 'utf-8'});
		var processing = 0;
		var ended = false;

		function onParse(msg) {
			processing--;

			messages.push(msg);	
			if (ended && ! processing)
				cb && cb(null);
		}

		function onMessage(msg) {
			processing++;
	
			var p = new MailParser();
			p.on('end', onParse);
			p.write(msg);
			p.end()
		}

		function onEnd() {
			ended = true;
		}

		mbox.on('message', onMessage);
		mbox.on('end', onEnd);

	};

	// todo: handle array of "in"
	// todo: check types on in and cb
	if (opts['in']) {
		this.add(opts['in'], function (err) {
			if (err) {
				cb && cb(err);
			} else {
				if (opts['out']) {
					self.write(opts['out'], cb);
				} else {
					cb && cb();
				}
			}
		});
	}

}

Mbox2Epub.defaults = {
	use_text: false,
	strip_background_images: true
};

module.exports = Mbox2Epub;