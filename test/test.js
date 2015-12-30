var Mbox2Epub = require('../');


var useText = true;

var mbpath = './test/test.mbox';
var outpath = './test/test.epub';

var opts = {
	title: 'Test Mailbox',
	author: 'John Doe',
	subjects: ['Computers', 'Periodicals', 'Technology'],
	use_text: false
};

var epub = new Mbox2Epub(opts);
epub.add(mbpath, function(err) {
	epub.write(outpath, function (err) {
		console.log('Done writing.');
	});
});