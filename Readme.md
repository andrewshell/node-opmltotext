# opmltotext

This is a node.js library that parses OPML and returns text. It generates output using specified indentation and comment prefix strings.

## Installation

```bash
$ npm install opmltotext
```

Requires Node.js 20 or newer.

## Example

```js
const fs = require('node:fs');
const OpmlToText = require('opmltotext');

const opml = fs.readFileSync('example.opml', 'utf8');
const text = OpmlToText.getText(opml);
```

See [`example/`](example) for a complete OPML input and the Markdown it produces.

## API

### OpmlToText.getText(opmlText, [commentPrefix], [indentation])

- `opmlText` `String` — the OPML document
- `commentPrefix` `String` — default `'//'`
- `indentation` `String` — default `'  '` (two spaces)

Each `<outline>` under `<body>` becomes a line, indented once per level of nesting.
The `text` attribute supplies the line content; an outline without one produces an
empty line.

Throws if the document is not well-formed XML or has no `<body>` element.

### Comments

An outline carrying `isComment="true"` is prefixed with `commentPrefix`, and so is
everything nested beneath it. The prefix sits at the depth where the comment began,
so deeper nesting is indented after the prefix:

```xml
<outline text="Notes">
  <outline text="draft" isComment="true">
    <outline text="detail"/>
  </outline>
</outline>
```

```
Notes
  //draft
  //  detail
```

A descendant can opt back out with `isComment="false"`.

## License

MIT
