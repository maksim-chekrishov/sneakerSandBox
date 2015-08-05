'use strict';
/**
 * Created by m.chekryshov on 01.08.15.
 */

var utils = {
    /**
     * Merge objects properties to object1
     * @param {object} obj1
     * @param {object} obj2
     * @returns {object}
     */
    merge: function(obj1, obj2) {
        if (!obj2) {
            return obj1;
        }
        each(obj2, function(key, value) {
            obj1[key] = value;
        });
        return obj1;
    },

    /**
     * Overwrite all properties of obj1 to similar properties of obj1
     * @param {object} obj1
     * @param {object} obj2
     * @returns {object}
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
    }

};