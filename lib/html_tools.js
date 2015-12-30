'use strict';

var Cheerio = require('cheerio'),
	_ = require('lodash');

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

function clean(html, options) {
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

module.exports = {
	clean: clean
};