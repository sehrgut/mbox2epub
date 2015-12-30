var Mbox2Epub = require('./lib/main.js');


var useText = true;

var mbpath = './data/Aro Course.mbox';
var outpath = './data/Aro Course.epub';
var outdir = './data/Aro Course';

var opts = {
	title: 'Aro Meditation Course',
	author: 'Aro Gar',
	subjects: ['Buddhism', 'Religion & Spirituality', 'Philosophy', 'Meditation'],
	use_text: false,
	flatten_tables: true
};

var epub = new Mbox2Epub(opts);
epub.add(mbpath, function(err) {
	epub.write(outpath, function (err) {
		console.log('Done writing.');
	});
});