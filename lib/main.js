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
	
	path_tools = require('./path_tools');

// dynamic files
var TEMPLATES = {
	chapter: handlebars.compile(fs.readFileSync(path.join(__dirname, 'templates', 'chapter.html')).toString('utf8'))
	};

var attr_blacklist = {
	'a': ['target'],
	'*': ['align', 'background', 'bgcolor', 'color', 'align', 'border'],
	'table,thead,tbody,tfoot,tr,th,td': ['width', 'height']
};

var tag_blacklist = ['script', 'noscript', 'form'];

function wrap($, el, html) {
	var wrap = Cheerio.load(html)(':root')[0];
	$(el).before(wrap);
	$(wrap).append(el);
}

function cleanHtml(html, options) {
	var $ = Cheerio.load(html);
	
	if ($('body').length)
		$ = Cheerio.load($('body').html());

	// rearrange invalid self-nesting
	$('a a, p p').each(function() {
		$(this).after(this.parentNode);
	});

	// strip tags we don't want or care about
	$(tag_blacklist.join(',')).remove();
	
	// remove attrs inappropriate for ebooks
	_.each(attr_blacklist, function(attrs, sel) {
		var $$ = $(sel);
		_.each(attrs, function (attr) {
			$$.removeAttr(attr);
		});
	});

	// wrap invalid children of certain elements
	var $invalid_children = $(':root, blockquote > *')
		.not('p,h1,h2,h3,h4,h5,h6,div,ul,ol,dl,pre,hr,blockquote,address,fieldset,table,switch,form,noscript,ins,del,script');
	
	if (typeof Cheerio.prototype.wrap === 'function')
		$invalid_children.wrap('<div />');
	else
		$invalid_children.each(function (i, el) { wrap($, el, '<div />'); });

	// strip backgrounds
	if (options.strip_background_images) {
		$('*')
			.css('background', '')
			.css('background-image', '');
		
		$('[style=""]')
			.removeAttr('style');
	}

	/* todo: split nodes around children that should be siblings,
	   i.e. <p attrs>foo<blockquote>bar</blockquote>baz</p> becomes
	   <p attrs>foo></p><blockquote>bar</blockquote><p attrs>baz</p>
	   http://stackoverflow.com/questions/24018192/split-an-element-containing-textnodes-and-elements-using-jquery
	*/

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

function buildHtml(msg, options) {
	// todo: better mime structure handling
	var hasHtml = (!! msg.html);

	var body = options.use_text || ! hasHtml ? marked(msg.text) : cleanHtml(msg.html, options);

	var params = {
		title: msg.subject,
		body: body
	};
	
	return TEMPLATES.chapter(params);
}

function Mbox2Epub(inpath, outpath, title, opts) {
	//todo accept stream instead of string
	var options = _.merge({}, Mbox2Epub.defaults, opts);
	var messages = [];
	var processing = 0;
	var ended = false;


	function finish() {
		var last_msg = messages[messages.length - 1];

		var out = fs.createWriteStream(outpath);

		var epub = new EpubGenerator({
			title: title,
			date: last_msg.date
		});
	
		epub.pipe(out);

		var digits = Math.ceil(Math.log10(messages.length + 1));
		var fn_spec = printf('%%0%dd - %%s.%%s', digits);

		for (var i=0, n=messages.length; i<n; i++) {
			var msg = messages[i];
			console.log(fmt('Found %s (%s)', msg.subject, msg.date));
		
			var isHtml = !! (msg.html);

			var body = isHtml ? buildHtml(msg, options) : msg.text;
			var mime = isHtml ? 'application/xhtml+xml' : 'text/plain' ;
			var ext = isHtml ? 'html' : 'txt' ;
			var path = printf(fn_spec, i + 1,
						path_tools.posix_escape(msg.subject), ext);

			epub.add(path, body, {
				mimetype: mime,
				toc: true,
				title: msg.subject
				});
		}
	
		epub.end();
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

	var mbox = new Mbox(inpath, { encoding: 'utf-8' });

	mbox.on('message', onMessage);
	mbox.on('end', onEnd);

}

Mbox2Epub.defaults = {
	use_text: false,
	strip_background_images: true
};

module.exports = Mbox2Epub;