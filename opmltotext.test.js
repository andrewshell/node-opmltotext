'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const OpmlToText = require('./opmltotext.js');

const EXAMPLE_DIR = path.join(__dirname, 'example');

/**
 * Wrap outline markup in a minimal OPML document.
 */
function opml(outlines) {
  return (
    '<?xml version="1.0"?>\n<opml version="2.0">\n<head><title>t</title></head>\n<body>\n' +
    outlines +
    '\n</body>\n</opml>\n'
  );
}

test('converts the committed example fixture byte for byte', () => {
  const input = fs.readFileSync(path.join(EXAMPLE_DIR, 'example.opml'), 'utf8');
  const expected = fs.readFileSync(
    path.join(EXAMPLE_DIR, 'example.md'),
    'utf8'
  );

  assert.strictEqual(OpmlToText.getText(input), expected);
});

test('indents nested outlines two spaces per level by default', () => {
  const text = OpmlToText.getText(
    opml(
      '<outline text="A"><outline text="B"><outline text="C"/></outline></outline>'
    )
  );

  assert.strictEqual(text, 'A\n  B\n    C\n');
});

test('emits an empty line for an outline with no text attribute', () => {
  const text = OpmlToText.getText(opml('<outline/><outline text="B"/>'));

  assert.strictEqual(text, '\nB\n');
});

test('decodes XML entities in text attributes', () => {
  const text = OpmlToText.getText(
    opml('<outline text="Tom &amp; Jerry &lt;3"/>')
  );

  assert.strictEqual(text, 'Tom & Jerry <3\n');
});

test('preserves leading and trailing whitespace in text attributes', () => {
  const text = OpmlToText.getText(opml('<outline text="  padded  "/>'));

  assert.strictEqual(text, '  padded  \n');
});

test('ignores non-outline elements inside body', () => {
  const text = OpmlToText.getText(
    opml('<note>skip me</note><outline text="A"/>')
  );

  assert.strictEqual(text, 'A\n');
});

test('prefixes a commented outline and everything beneath it', () => {
  const text = OpmlToText.getText(
    opml('<outline text="A" isComment="true"><outline text="B"/></outline>')
  );

  assert.strictEqual(text, '//A\n//  B\n');
});

test('places the comment prefix at the depth the comment started', () => {
  const text = OpmlToText.getText(
    opml(
      '<outline text="A"><outline text="B" isComment="true"><outline text="C"/></outline></outline>'
    )
  );

  assert.strictEqual(text, 'A\n  //B\n  //  C\n');
});

test('isComment="false" opts a child back out of an enclosing comment', () => {
  const text = OpmlToText.getText(
    opml(
      '<outline text="A" isComment="true"><outline text="B" isComment="false"/></outline>'
    )
  );

  assert.strictEqual(text, '//A\n  B\n');
});

test('restores the enclosing indentation after a comment subtree ends', () => {
  const text = OpmlToText.getText(
    opml(
      '<outline text="A" isComment="true"><outline text="B"/></outline><outline text="C"><outline text="D"/></outline>'
    )
  );

  assert.strictEqual(text, '//A\n//  B\nC\n  D\n');
});

test('honors a custom comment prefix and indentation', () => {
  const text = OpmlToText.getText(
    opml('<outline text="A" isComment="true"><outline text="B"/></outline>'),
    '# ',
    '\t'
  );

  assert.strictEqual(text, '# A\n# \tB\n');
});

test('accepts an empty string as the comment prefix', () => {
  const text = OpmlToText.getText(
    opml('<outline text="A" isComment="true"/>'),
    ''
  );

  assert.strictEqual(text, 'A\n');
});

test('returns an empty string for a body with no outlines', () => {
  assert.strictEqual(OpmlToText.getText(opml('')), '');
});

test('finds body regardless of nesting depth', () => {
  const text = OpmlToText.getText(
    '<?xml version="1.0"?><opml><wrapper><body><outline text="A"/></body></wrapper></opml>'
  );

  assert.strictEqual(text, 'A\n');
});

test('throws on malformed XML', () => {
  assert.throws(
    () => OpmlToText.getText('<opml><body><outline text="A"></body></opml>'),
    /Invalid OPML/
  );
});

test('throws when the document has no body element', () => {
  assert.throws(
    () =>
      OpmlToText.getText(
        '<?xml version="1.0"?><opml><head><title>t</title></head></opml>'
      ),
    /no <body> element/
  );
});
