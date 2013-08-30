var libxmljs = require("libxmljs")

var OpmlToText = function (opmlText, commentPrefix, indendation) {
  this.opmlText = opmlText

  if (commentPrefix === undefined) {
    commentPrefix = "//"
  }

  this.commentPrefix = commentPrefix

  if (indendation === undefined) {
    indendation = "  " // NPM coding style expects two spaces
  }

  this.indendation = indendation
}

OpmlToText.prototype.getText = function () {
  if (this.result !== undefined) {
    return this.result
  }

  this.result = ""
  this.nestingLevel = 0
  this.preCommentNestingLevel = 0
  this.inComment = false
  this.isParentCommented = false
  
  this._createLibXmlDoc()
  this._initializeStack()
  this._buildResult()

  return this.result
}

OpmlToText.prototype._createLibXmlDoc = function () {
  this.opmlDoc = libxmljs.parseXml(this.opmlText)
}

OpmlToText.prototype._initializeStack = function () {
  this.stack = this.opmlDoc.find("//body")[0].find("outline")
}

OpmlToText.prototype._buildResult = function () {
  while (this.stack.length > 0) {
    var currentNode = this.stack.shift()
    if (currentNode.isPlaceholderInfo) {
      this.nestingLevel--
      this.inComment = currentNode.isCommented
      if (currentNode.preCommentNestingLevel !== null) {
        console.log("currentNode.preCommentNestingLevel: " + currentNode.preCommentNestingLevel)
        this.preCommentNestingLevel = currentNode.preCommentNestingLevel
      }
      if (!this.inComment) {
        console.log("currentNode.preCommentNestingLevel: 0 (!this.inComment)")
        this.preCommentNestingLevel = 0
      }
      continue
    }
    this.result += this._convertNodeToText(currentNode) + "\n"
  }
}

OpmlToText.prototype._convertNodeToText = function (currentNode) {
  var isComment = this._isNodeComment(currentNode)
  var childOutlineNodes = currentNode.find("outline")

  var resultLine = this._getLinePrefix(isComment) + this._getNodeText(currentNode)

  if (childOutlineNodes.length > 0) {
    this._unshiftChildrenOntoStack(childOutlineNodes, isComment)
  }

  return resultLine
}

OpmlToText.prototype._isNodeComment = function (currentNode) {
  var isComment = this.inComment

  var commentAttribute = currentNode.attr("isComment")

  if (commentAttribute !== null) {
    isComment = (commentAttribute.value() == "true")
    if (isComment) {
      this.preCommentNestingLevel = this.nestingLevel
    }
  }

  return isComment
}

OpmlToText.prototype._getLinePrefix = function (isComment) {
  var indendationText = ""

  for (var i = 0; i < this.preCommentNestingLevel; i++) {
    indendationText += this.indendation
  }
  
  if (isComment) {
    indendationText += this.commentPrefix
  }

  for (var i = this.preCommentNestingLevel; i < this.nestingLevel; i++) {
    indendationText += this.indendation
  }

  return indendationText
}

OpmlToText.prototype._getNodeText = function (currentNode) {
  var nodeText = ""

  var textAttribute = currentNode.attr("text")

  if (textAttribute !== null) {
    nodeText = textAttribute.value()
  }

  return nodeText
}

OpmlToText.prototype._unshiftChildrenOntoStack = function (childOutlineNodes, isComment) {
  this.nestingLevel++

  this.isParentCommented = this.inComment
  this.inComment = isComment

  var placeholderInfo = {
    isPlaceholderInfo: true,
    isCommented: this.isParentCommented,
    preCommentNestingLevel: (this.isParentCommented == this.inComment ? null : this.nestingLevel)
  }

  this.stack.unshift(placeholderInfo)
  this.stack = childOutlineNodes.concat(this.stack)
}

exports.getText = function (opmlText, commentPrefix, indendation) {
  var converter = new OpmlToText(opmlText, commentPrefix, indendation)
  return converter.getText()
}