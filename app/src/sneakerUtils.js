'use strict';
/**
 * Created by m.chekryshov on 01.08.15.
 */

module.exports = {
    /**
     * Merge objects properties to object1
     * @param {Object} obj1
     * @param {Object} obj2
     * @returns {Object}
     */
    merge: function(obj1, obj2) {
        if (!obj2) {
            return obj1;
        }

        for (var key in obj2) {
            if (obj2.hasOwnProperty(key)) {
                obj1[key] = obj2[key];
            }
        }

        return obj1;
    },

    /**
     * Overwrite all properties of obj1 to similar properties of obj1
     * @param {Object} obj1
     * @param {Object} obj2
     * @returns {Object}
     */
    overwriteProperties: function(obj1, obj2) {
        if (!obj2) {
            return obj1;
        }
        each(obj2, function(key, value) {
            if (obj1.hasOwnProperty(key)) {
                obj1[key] = value;
            }
        });

        return obj1;
    },

    /**
     * Check that smth is function
     * @param {*} smth
     * @returns {boolean}
     */
    isFunction: function(smth) {
        return typeof smth === 'function';
    },

    /**
     * Simple formatting function
     * Example of usage:
     *  this.format('His name was {0} {1}.','Maksim','Kindzadza') // => 'His name was Maksim Kindzadza.'
     * @param {string}
     * @return {string}
     */
    format: function(str) {
        var args = Array.prototype.slice.call(arguments);
        args.splice(0, 1);

        if (!args || !args.length) {
            return str;
        }

        return str.replace(/\{\{|\}\}|\{(\d+)\}/g, function(m, n) {
            if (m == '{{') {
                return '{';
            }

            if (m == '}}') {
                return '}';
            }

            return args[n];
        });
    },

    /**
     * Check if string has supplied suffix
     * @param {string} string
     * @param {string} suffix
     * @returns {boolean}
     */
    endWith: function(string, suffix) {
        return string.length >= suffix.length && string.substr(string.length - suffix.length) == suffix;
    },

    getFunctionName: function(func) {
        return func.toString().substr(9).split('(')[0].replace(/\s*/g, '');

    }

};