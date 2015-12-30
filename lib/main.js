var Mbox = require('node-mbox'),
	Cheerio = require('cheerio'),
	MailParser = require('mailparser').MailParser,
	EpubGenerator = require('epub-generator'),
	EpubGen = require('epub-gen'),
	handlebars = require('handlebars'),
	sanitize_filename = require("sanitize-filename"),
	fs = require('graceful-fs'),
	printf = require('printf'),
	fmt = require('util').format,
	md = require("node-markdown").Markdown,
	path = require('path');

var Generators = {
	EPUB_GEN: 1,
	EPUB_GENERATOR: 2
}

// dynamic files
var TEMPLATES = {
	chapter: handlebars.compile(fs.readFileSync(path.join(__dirname, 'templates', 'chapter.html')).toString('utf8'))
	};


var useText = true;
var generator = Generators.EPUB_GENERATOR;

var mbpath = './data/Aro Course.mbox';
var outpath = './data/Aro Course.epub';
var outdir = './data/Aro Course';

var messages = [];
var processing = 0;
var ended = false;

function sanitizefn(fn) {
	fn = sanitize_filename(fn);
	fn = fn.replace(/#/g,''); //epub-generator uses fn for href and ID without encoding
	return fn;
}

function cleanHtml(html) {
	var $ = Cheerio.load(html);
	
	if ($('body').length)
		$ = Cheerio.load($('body').html());

	// invalid self-nesting not enforced by Cheerio
	$('a a, p p').each(function() {
		$(this).after(this.parentNode);
	});

	// tags we don't want or care about
	$('script').remove();

	/*
	        $("img").each(function(index, elem) {
          var id, url;
          url = $(elem).attr("src");
          id = uuid();
          $(elem).attr("src", "images/" + id + ".jpg");
          return self.options.images.push({
            id: id,
            url: url
          });
        });
        content.data = $.html();
*/

	return $.xml();
}

function buildHtml(msg) {
	var hasHtml = (!! msg.html);

	var body = useText || ! hasHtml ? md(msg.text) : cleanHtml(msg);

	var opts = {
		title: msg.subject,
		body: body
	};
	
	return TEMPLATES.chapter(opts);

//	return fmt('<!DOCTYPE html>\n\n<html><head><title>%s</title></head><body>%s</body></html>', msg.subject, body);
}

function finish_as_markdown() {
	var last_msg = messages[messages.length - 1];

	var opts = {
		title: 'Aro Meditation Guide',
		author: 'anon',
		content: []
	};

	for (var i=0, n=messages.length; i<n; i++) {
		var msg = messages[i];
		var chapter = {
			title: msg.subject,
			data: md(msg.text)
		};
		
		opts.content.push(chapter);
	}

	new EpubGen(opts, outpath);
}

function finish_as_text() {
	fs.mkdirSync(outdir);

	for (var i=0, n=messages.length; i<n; i++) {
		var msg = messages[i];
		var fn = printf('%02d - %s.txt', i, sanitizefn(msg.subject));
		var fp = path.join(outdir, fn);
		fs.writeFile(fp, msg.text, null);
	}
}

function finish_with_epubgen() {
	var last_msg = messages[messages.length - 1];

	var opts = {
		title: 'Aro Meditation Guide',
		author: 'anon',
		content: []
	};

	for (var i=0, n=messages.length; i<n; i++) {
		var msg = messages[i];
		var chapter = {
			title: msg.subject,
			data: buildHtml(msg)
		};
		
		opts.content.push(chapter);
	}

	new EpubGen(opts, outpath.replace('.epub', '-gen1.epub'));

}

function finish_with_epubgenerator() {
	var last_msg = messages[messages.length - 1];

	var out = fs.createWriteStream(outpath.replace('.epub','-gen2.epub'));

	var epub = new EpubGenerator({
		title: 'Aro Meditation Guide',
		date: last_msg.date
	});
	
	epub.pipe(out);

	for (var i=0, n=messages.length; i<n; i++) {
		var msg = messages[i];
		console.log(fmt('Found %s (%s)', msg.subject, msg.date));
		
		var isHtml = !! (msg.html);

		var body = isHtml ? buildHtml(msg) : msg.text;
		var mime = isHtml ? 'application/xhtml+xml' : 'text/plain' ;
		var ext = isHtml ? 'html' : 'txt' ;
		var path = printf('%02d - %s.%s', i, sanitizefn(msg.subject), ext);

		epub.add(path, body, {
			mimetype: mime,
			toc: true,
			title: msg.subject
			});
	}
	
	epub.end();
}

function finish() {
	switch(generator) {
		case Generators.EPUB_GEN:
			finish_with_epubgen();
			break;
		case Generators.EPUB_GENERATOR:
			finish_with_epubgenerator();
			break;
		default:
			throw new Error(fmt('Invalid generator: %s', generator));
	}
}

function onParse(msg) {
	processing--;

	messages.push(msg);	
	if (ended && ! processing)
		finish();
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


var mbox = new Mbox(mbpath, { encoding: 'utf-8' });

mbox.on('message', onMessage);
mbox.on('end', onEnd);