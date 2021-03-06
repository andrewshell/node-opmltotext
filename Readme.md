# opmltotext

This is a node.js library that parses OPML and returns text.  It generates output using specified indentation and comment prefix strings.

[![NPM](https://nodei.co/npm/opmltotext.png)](https://nodei.co/npm/opmltotext/)

## Installation

```bash
$ npm install opmltotext
```

## Example

```js
var fs = require('fs')
  , OpmlToText = require('opmltotext')

var opml = fs.readFileSync('example.opml', 'utf8')
var text = OpmlToText.getText(opml)
```

## API

### OpmlToText.getText(opmlText, [commentPrefix], [indentation])

* opmlText `String`
* commentPrefix `String` default '//'
* indentation `String` default '  ' (two spaces)