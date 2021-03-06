const traits = require("../traits");
const { isContent } = require("../doc-utils");
const { throwRawTagShouldBeOnlyTextInParagraph } = require("../errors");

const moduleName = "rawxml";
const wrapper = require("../module-wrapper");

function getNearestLeft(parsed, elements, index) {
	for (let i = index; i >= 0; i--) {
		const part = parsed[i];
		for (let j = 0, len = elements.length; j < len; j++) {
			const element = elements[j];
			if (
				part.value.indexOf("<" + element) === 0 &&
				[">", " "].indexOf(part.value[element.length + 1]) !== -1
			) {
				return elements[j];
			}
		}
	}
	return null;
}

function getNearestRight(parsed, elements, index) {
	for (let i = index, l = parsed.length; i < l; i++) {
		const part = parsed[i];
		for (let j = 0, len = elements.length; j < len; j++) {
			const element = elements[j];
			if (part.value === "</" + element + ">") {
				return elements[j];
			}
		}
	}
	return -1;
}

function getInner({ part, left, right, postparsed, index }) {
	const before = getNearestLeft(postparsed, ["w:p", "w:tc"], left - 1);
	const after = getNearestRight(postparsed, ["w:p", "w:tc"], right + 1);
	if (after === "w:tc" && before === "w:tc") {
		part.emptyValue = "<w:p></w:p>";
	}
	const paragraphParts = postparsed.slice(left + 1, right);
	paragraphParts.forEach(function(p, i) {
		if (i === index - left - 1) {
			return;
		}
		if (isContent(p)) {
			throwRawTagShouldBeOnlyTextInParagraph({ paragraphParts, part });
		}
	});
	return part;
}

const rawXmlModule = {
	name: "RawXmlModule",
	prefix: "@",
	optionsTransformer(options, docxtemplater) {
		this.fileTypeConfig = docxtemplater.fileTypeConfig;
		return options;
	},
	parse(placeHolderContent) {
		const type = "placeholder";
		if (placeHolderContent[0] !== this.prefix) {
			return null;
		}
		return { type, value: placeHolderContent.substr(1), module: moduleName };
	},
	postparse(postparsed) {
		return traits.expandToOne(postparsed, {
			moduleName,
			getInner,
			expandTo: this.fileTypeConfig.tagRawXml,
		});
	},
	render(part, options) {
		if (part.module !== moduleName) {
			return null;
		}
		let value = options.scopeManager.getValue(part.value, { part });
		if (value == null) {
			value = options.nullGetter(part);
		}
		if (!value) {
			return { value: part.emptyValue || "" };
		}
		return { value };
	},
	resolve(part, options) {
		if (!part.type === "placeholder" || part.module !== moduleName) {
			return null;
		}
		return options.scopeManager
			.getValueAsync(part.value, { part })
			.then(function(value) {
				if (value == null) {
					return options.nullGetter(part);
				}
				return value;
			});
	},
};

module.exports = () => wrapper(rawXmlModule);
