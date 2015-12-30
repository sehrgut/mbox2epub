var Mbox2Epub = require('./lib/main.js');


var useText = true;

var mbpath = './data/Aro Course.mbox';
var outpath = './data/Aro Course.epub';
var outdir = './data/Aro Course';

var opts = {
	use_text: false,
	strip_background_images: true
};

new Mbox2Epub(mbpath, outpath, 'Aro Meditation Course', opts);