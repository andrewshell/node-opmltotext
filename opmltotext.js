const libxmljs = require("libxmljs");

function OpmlToText(opmlText, commentPrefix, indentation) {
    this.opmlText = opmlText;

    if (commentPrefix === undefined) {
        commentPrefix = "//";
    }

    this.commentPrefix = commentPrefix;

    if (indentation === undefined) {
        indentation = "  "; // NPM coding style expects two spaces
    }

    this.indentation = indentation;
}

OpmlToText.prototype.getText = function () {
    if (this.result !== undefined) {
        return this.result;
    }

    this.result = "";
    this.nestingLevel = 0;
    this.preCommentNestingLevel = 0;
    this.inComment = false;
    this.isParentCommented = false;

    this._createLibXmlDoc();
    this._initializeStack();
    this._buildResult();

    return this.result;
};

OpmlToText.prototype._createLibXmlDoc = function () {
    this.opmlDoc = libxmljs.parseXml(this.opmlText);
};

OpmlToText.prototype._initializeStack = function () {
    this.stack = this.opmlDoc.find("//body")[0].find("outline");
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
        this.result += this._convertNodeToText(currentNode) + "\n";
    }
};

OpmlToText.prototype._convertNodeToText = function (currentNode) {
    var isComment = this._isNodeComment(currentNode),
        childOutlineNodes = currentNode.find("outline"),

        resultLine = this._getLinePrefix(isComment) + this._getNodeText(currentNode);

    if (childOutlineNodes.length > 0) {
        this._unshiftChildrenOntoStack(childOutlineNodes, isComment);
    }

    return resultLine;
};

OpmlToText.prototype._isNodeComment = function (currentNode) {
    var isComment = this.inComment,

        commentAttribute = currentNode.attr("isComment");

    if (commentAttribute !== null) {
        isComment = (commentAttribute.value() === "true");
        if (isComment) {
            this.preCommentNestingLevel = this.nestingLevel;
        }
    }

    return isComment;
};

OpmlToText.prototype._getLinePrefix = function (isComment) {
    let indentationText = "", i;

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
    var nodeText = "",

        textAttribute = currentNode.attr("text");

    if (textAttribute !== null) {
        nodeText = textAttribute.value();
    }

    return nodeText;
};

OpmlToText.prototype._unshiftChildrenOntoStack = function (childOutlineNodes, isComment) {
    const placeholderInfo = {
        isPlaceholderInfo: true,
        isCommented: 0,
        preCommentNestingLevel: null
    };

    this.nestingLevel++;

    this.isParentCommented = this.inComment;
    this.inComment = isComment;

    placeholderInfo.isCommented = this.isParentCommented;
    placeholderInfo.preCommentNestingLevel = (this.isParentCommented === this.inComment ? null : this.nestingLevel);

    this.stack.unshift(placeholderInfo);
    this.stack = childOutlineNodes.concat(this.stack);
};

exports.getText = function (opmlText, commentPrefix, indentation) {
    var converter = new OpmlToText(opmlText, commentPrefix, indentation);
    return converter.getText();
};
