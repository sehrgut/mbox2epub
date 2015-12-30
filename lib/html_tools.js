'use strict';

var Cheerio = require('cheerio'),
	_ = require('lodash');

var attr_blacklist = {
	'a': ['target'],
	'*': ['align', 'background', 'bgcolor', 'color', 'align', 'border'],
	'table,thead,tbody,tfoot,tr,th,td': ['width', 'height']
};

var tag_blacklist = ['script', 'noscript', 'form'];

function flatten_table($, tbl, options) {
	var $t = $(tbl);
	var tbl_attrs = {
		'class': $t.attr('class'),
		'id': $t.attr('id'),
		'style': $t.attr('style')
		};
	
	$t.wrap('<div />');
	var $wrapper = $t.parent();
	
	$t.find('td').each(function (i, td) {
		var $d = Cheerio.load('<div />')('div');
		var $td = $(td);
		
		$d.append($td.contents());
		var td_attrs = {
			'class': $td.attr('class'),
			'id': $td.attr('id'),
			'style': $td.attr('style')
			};
		
		$d.attr(_.omit(td_attrs, _.isUndefined));

		$(td).remove();
		
		$wrapper.append($d);
	});
	
	$t.remove();
	$wrapper.attr(_.omit(tbl_attrs, _.isUndefined));
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
		.not('p,h1,h2,h3,h4,h5,h6,div,ul,ol,dl,pre,hr,blockquote,address,fieldset,table,switch,form,noscript,ins,del,script')
		.wrap('<div />');

	// strip backgrounds
	if (options.strip_background_images) {
		$('*')
			.css('background', '')
			.css('background-image', '');
		
		$('[style=""]')
			.removeAttr('style');
	}
	
	if (options.flatten_tables)
		$('table').each(function (i, el) { flatten_table($, el, options); });

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