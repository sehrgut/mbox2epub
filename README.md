# mbox2epub
converts mbox mailboxes to epub, in a moderately-dumb fashion

## Introduction
I wrote this to have an easy way to convert IMAP directories
into which digest subscriptions were sorted for use on an 
e-reader.  

### From the terminal . . .
```bash
mbox2epub \
	--title 'Book Title' \
	--author 'Author Name' \
	-s Subjects -s Become -s Categories -s And -s Collections \
	--flatten-tables \
	./path/to/your.mbox > ./path/to/your.epub
```

### . . . or in code
```javascript
var Mbox2Epub = require('mbox2epub');

var mbpath = './path/to/your.mbox';
var outpath = './path/to/your.epub';

var opts = {
	title: 'Book Title',
	author: 'Author Name',
	subjects: ['Subjects', 'Become', 'Categories', 'And', 'Collections'],
	flatten_tables: true // tables break on many readers
};

var epub = new Mbox2Epub(opts);
epub.add(mbpath, function(err) {
	epub.write(outpath, function (err) {
		console.log('Done writing.');
	});
});
```

## Installation
`npm install --global mbox2epub`

## Features
* One message becomes one chapter
* Creates markdown-ified HTML from plain-text emails
* Cleans up HTML emails to become valid EPUB chapters

## CLI

```
% mbox2epub --help
Usage: node mbox2epub

  -m, --mbox=PATH+               mbox to parse (defaults to stdin)
  -o, --out=PATH                 output path (defaults to stdout)
  -t, --title=STRING             publication title
  -a, --author=STRING            publication author
  -s, --subject=STRING+          subject/category tag
      --uuid=ID                  publication unique ID (e.g. UUID, ASIN, ISBN, ISSN) (defaults: random UUID)
      --language=LANG            publication language
      --description=STRING       publication description/summary
      --rights=STRING            copyleft/right statement
      --date=DATE                publication date (defaults to last date of message in mbox)
      --cover=PATH               path or URL to cover image (not implemented)
      --use-text                 force use of text/plain message part even if text/html is present
      --strip-background-images  remove background and background-image inline styles
      --flatten-tables           convert tables to divs for readers that can't handle them
  -h, --help                     display this help
  -v, --version                  show version
  -V, --verbose                  verbose logging to stderr
```

## API

### new Mbox2Epub(options, [cb])
* `options`: object
  * `in`: path, stream, or string - location or content of mbox. If both `in` and `out` are present, EPUB will be generated at construction
  * `out`: path - location of destination EPUB, will be clobbered
  * `encoding`: string - encoding of mbox data (default: `"utf-8"`)
  * `use_text`: boolean - force use of text/plain MIME part even if text/html part is available (default: `false`)
  * `strip_background_images`: boolean - remove background and background-image inline styles (default: `false`)
  * `flatten_tables`: boolean - replace tables with divs containing the contents of their cells in child divs, preserving class, style, and id (default: `false`)
  * `uuid`, `title`, `language`, `author`, `subjects`,`description`, `rights`, `date`, `cover`: mixed - metadata passed directly to `epub-generator`.
* `cb`: _function(err)_ - called when EPUB has been written (using `options.in` and `options.out`)

Returns new EPUB object. If `in` and `out` were provided, automatically adds `in` to EPUB and writes the resulting file to `out`, calling `cb` on completion.

### Mbox2Epub#add(mb, cb)
* `mb`: path, stream, or string - location or content of mbox
* `cb`: _function(err)_ - called when mbox has been parsed and EPUB is ready for writing

Adds `mb` to EPUB, calling `cb` on completion.

### Mbox2Epub#write(path, cb)
* `path`: path - location of destination EPUB, will be clobbered
* `cb`: _function(err)_ - called when EPUB has been written

Writes EPUB to `path`, calling `cb` on completion.

### Mbox2Epub#stream()
Returns a `stream.Readable` which provides the EPUB data.

## Examples

### Create EPUB in single statement
```javascript
new Mbox2Epub({
	in: 'path/to.mbox',
    out: 'path/to.epub',
    title: 'My Epub',
    author: 'Author Name'
    cb: function(err) {
    	console.log(err ? err : 'Done');
    }
});
```

### Create EPUB with one mbox
```javascript
var epub = new Mbox2Epub({
	title: 'My Epub',
    author: 'Author Name'
});

epub.add('my.mbox', function (err) {
	if (err)
    	console.log(err);
    else
      epub.write('my.epub', function (err) {
          if (err)
              console.log(err);
          else
              console.log('Success!')
      });
});
```

### Create EPUB on STDOUT using multiple mboxes
```javascript
var epub = new Mbox2Epub({
	title: 'My Epub',
    author: 'Author Name'
});

var mboxes = ['1.mbox', '2.mbox', '3.mbox'];

function add_mboxes(err) {
	if (err) {
    	console.log(err);
    } else if (mboxes.length) {
		epub.add(mboxes.shift(), add_mboxes);
    } else {
		epub.stream().pipe(process.stdout);
    }    
}

add_mboxes();

```













