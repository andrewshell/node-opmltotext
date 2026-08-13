'use strict';

const { XMLParser, XMLValidator } = require('fast-xml-parser');

// fast-xml-parser's preserveOrder mode represents each element as an object
// with a single tag-name key holding an ordered array of children, plus an
// optional `:@` key holding that element's attributes.
const ATTRS_KEY = ':@';
const ATTR_PREFIX = '@_';

// trimValues and parseAttributeValue are both off so attribute values survive
// exactly as authored, which is what the old libxmljs-backed version did.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR_PREFIX,
  preserveOrder: true,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: true,
});

function tagName(entry) {
  const keys = Object.keys(entry);
  let i;

  for (i = 0; i < keys.length; i++) {
    if (keys[i] !== ATTRS_KEY) {
      return keys[i];
    }
  }

  return null;
}

// Element children arrive as an array; text nodes (`#text`) hold a bare string,
// which has no children of its own.
function children(entry) {
  const tag = tagName(entry);
  const value = tag === null ? null : entry[tag];

  return Array.isArray(value) ? value : [];
}

function attr(entry, name) {
  const attrs = entry[ATTRS_KEY];
  const key = ATTR_PREFIX + name;

  if (
    attrs === undefined ||
    !Object.prototype.hasOwnProperty.call(attrs, key)
  ) {
    return null;
  }

  return String(attrs[key]);
}

function childElements(entry, tag) {
  return children(entry).filter((child) => tagName(child) === tag);
}

// Stands in for libxmljs's `//body` XPath: first matching element at any depth.
function findFirstDescendant(entries, tag) {
  let i, found;

  for (i = 0; i < entries.length; i++) {
    if (tagName(entries[i]) === tag) {
      return entries[i];
    }

    found = findFirstDescendant(children(entries[i]), tag);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function OpmlToText(opmlText, commentPrefix, indentation) {
  this.opmlText = opmlText;

  if (commentPrefix === undefined) {
    commentPrefix = '//';
  }

  this.commentPrefix = commentPrefix;

  if (indentation === undefined) {
    indentation = '  '; // NPM coding style expects two spaces
  }

  this.indentation = indentation;
}

OpmlToText.prototype.getText = function () {
  if (this.result !== undefined) {
    return this.result;
  }

  this.result = '';
  this.nestingLevel = 0;
  this.preCommentNestingLevel = 0;
  this.inComment = false;
  this.isParentCommented = false;

  this._parseDocument();
  this._initializeStack();
  this._buildResult();

  return this.result;
};

OpmlToText.prototype._parseDocument = function () {
  const validation = XMLValidator.validate(this.opmlText);

  if (validation !== true) {
    throw new Error('Invalid OPML: ' + validation.err.msg);
  }

  this.opmlDoc = parser.parse(this.opmlText);
};

OpmlToText.prototype._initializeStack = function () {
  const body = findFirstDescendant(this.opmlDoc, 'body');

  if (body === null) {
    throw new Error('Invalid OPML: no <body> element');
  }

  this.stack = childElements(body, 'outline');
};

OpmlToText.prototype._buildResult = function () {
  let currentNode;
  while (this.stack.length > 0) {
    currentNode = this.stack.shift();
    if (currentNode.isPlaceholderInfo) {
      this.nestingLevel--;
      this.inComment = currentNode.isCommented;
      if (currentNode.preCommentNestingLevel !== null) {
        this.preCommentNestingLevel = currentNode.preCommentNestingLevel;
      }
      if (!this.inComment) {
        this.preCommentNestingLevel = 0;
      }
      continue;
    }
    this.result += this._convertNodeToText(currentNode) + '\n';
  }
};

OpmlToText.prototype._convertNodeToText = function (currentNode) {
  const isComment = this._isNodeComment(currentNode),
    childOutlineNodes = childElements(currentNode, 'outline'),
    resultLine =
      this._getLinePrefix(isComment) + this._getNodeText(currentNode);

  if (childOutlineNodes.length > 0) {
    this._unshiftChildrenOntoStack(childOutlineNodes, isComment);
  }

  return resultLine;
};

OpmlToText.prototype._isNodeComment = function (currentNode) {
  let isComment = this.inComment;

  const commentAttribute = attr(currentNode, 'isComment');

  if (commentAttribute !== null) {
    isComment = commentAttribute === 'true';
    if (isComment) {
      this.preCommentNestingLevel = this.nestingLevel;
    }
  }

  return isComment;
};

OpmlToText.prototype._getLinePrefix = function (isComment) {
  let indentationText = '',
    i;

  for (i = 0; i < this.preCommentNestingLevel; i++) {
    indentationText += this.indentation;
  }

  if (isComment) {
    indentationText += this.commentPrefix;
  }

  for (i = this.preCommentNestingLevel; i < this.nestingLevel; i++) {
    indentationText += this.indentation;
  }

  return indentationText;
};

OpmlToText.prototype._getNodeText = function (currentNode) {
  const textAttribute = attr(currentNode, 'text');

  return textAttribute === null ? '' : textAttribute;
};

OpmlToText.prototype._unshiftChildrenOntoStack = function (
  childOutlineNodes,
  isComment
) {
  const placeholderInfo = {
    isPlaceholderInfo: true,
    isCommented: 0,
    preCommentNestingLevel: null,
  };

  this.nestingLevel++;

  this.isParentCommented = this.inComment;
  this.inComment = isComment;

  placeholderInfo.isCommented = this.isParentCommented;
  placeholderInfo.preCommentNestingLevel =
    this.isParentCommented === this.inComment ? null : this.nestingLevel;

  this.stack.unshift(placeholderInfo);
  this.stack = childOutlineNodes.concat(this.stack);
};

exports.getText = function (opmlText, commentPrefix, indentation) {
  const converter = new OpmlToText(opmlText, commentPrefix, indentation);
  return converter.getText();
};
