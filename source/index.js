const path = require("path");
const fs = require("fs");
const { encode: encodeDataURI } = require("strong-data-uri");

/**
 * @module Iconographer
 */

function findMatchingDomain(domain, domains, lookup) {
    const domainKey = domain.toLowerCase();
    if (domains.includes(domain)) {
        return domain;
    }
    const innerDomain = domains.find(
        domainToTest =>
            domain.length > domainToTest.length &&
            domain.indexOf(domainToTest) === domain.length - domainToTest.length &&
            domain[domain.indexOf(domainToTest) - 1] === "."
    );
    if (innerDomain) {
        return innerDomain;
    }
    const matchingRecordKey = Object.keys(lookup).find(test => new RegExp(test).test(domain));
    if (matchingRecordKey) {
        return lookup[matchingRecordKey];
    }
    return domain;
}

/**
 * @typedef {Object} IconOptions
 * @property {Boolean=} greyscale - Whether or not to request greyscale icons (default false)
 */

/**
 * Get the Data URI for an icon
 * @param {String} domain The domain to get an icon for
 * @param {IconOptions=} opts Options
 * @returns {Promise.<String>} A promise that resolves with the data URI
 * @memberof module:Iconographer
 */
function getIconDataURI(domain, opts) {
    const readIconProcess = new Promise((resolve, reject) => {
        const iconFilename = getIconFilename(domain, opts);
        fs.readFile(iconFilename, (err, buff) => {
            if (err) {
                return reject(err);
            }
            resolve(buff);
        });
    });
    return readIconProcess.then(iconData => encodeDataURI(iconData, "image/png"));
}

/**
 * @typedef {Object} IconDetails
 * @property {String} filename The full path of the icon file
 * @property {Boolean} isDefault Whether the icon is the default icon or not
 */

/**
 * Get icon details for a domain
 * @param {String} domain The domain to get icon details for
 * @param {IconOptions=} param1 Options for getting the icon
 * @returns {IconDetails} Icon details
 * @memberof module:Iconographer
 */
function getIconDetails(domain, { greyscale = false } = {}) {
    const { domains, match } = require("../resources/index.json");
    const domainKey = findMatchingDomain(domain, Object.keys(domains), match);
    let filename,
        isDefault = false;
    if (domains[domainKey]) {
        const { filename: imageFilename, filenameGreyscale: imageFilenameGrey } = domains[domainKey];
        filename = greyscale ? imageFilenameGrey : imageFilename;
        filename = path.resolve(__dirname, "../resources/images/", filename);
    } else {
        isDefault = true;
        filename = greyscale ? "default.grey.png" : "default.png";
        filename = path.resolve(__dirname, "../resources/images/", filename);
    }
    return {
        filename,
        isDefault
    };
}

/**
 * Get the filename of an icon for a domain
 * @param {String} domain The domain
 * @param {IconOptions=} opts Options for getting the icon
 * @returns {String} The icon filename
 * @memberof module:Iconographer
 */
function getIconFilename(domain, opts) {
    return getIconDetails(domain, opts).filename;
}

/**
 * Check if a unique icon exists for a domain
 * @param {String} domain The domain to check for
 * @returns {Boolean} True if a unique icon exists, false if only the default icon
 * @memberof module:Iconographer
 */
function iconExists(domain) {
    return getIconDetails(domain).isDefault === false;
}

module.exports = {
    getIconDataURI,
    getIconDetails,
    getIconFilename,
    iconExists
};
