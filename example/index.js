const fs = require('fs'),
    OpmlToText = require('../opmltotext'),

    opml = fs.readFileSync('example.opml', 'utf8'),
    text = OpmlToText.getText(opml);

fs.writeFileSync('example.md', text, 'utf8');
