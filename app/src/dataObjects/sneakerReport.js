'use strict';
/**
 * Created by m.chekryshov on 01.08.15.
 */

function SneakerReport (options) {
    utils.overwriteProperties(this, options);
}

/**
 * Duration of javascript session
 * @type {number}
 */
SneakerReport.prototype.sessionDuration = 0;

/**
 * URL of the document that loaded the current document.
 * @type {string}
 */
SneakerReport.prototype.referer = '';

/**
 * Report extra data
 * @type {object}
 */
SneakerReport.prototype.extra = null;

/**
 * User agent
 * @type {string}
 */
SneakerReport.prototype.userAgent = null;

/**
 * Error stack
 * @type {string}
 */
SneakerReport.prototype.stack = null;

/**
 * Error message
 * @type {string}
 */
SneakerReport.prototype.message = '';

/**
 * Report level
 * @type {string}
 */
SneakerReport.prototype.level = '';

/**
 * Line number
 * @type {string}
 */
SneakerReport.prototype.lineNumber = '';



