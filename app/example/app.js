'use strict';
/**
 * Created by m.chekryshov on 30.07.15.
 */
(function(){

    $('.js-handled-error-button').click(handledError);
    $('.js-unhandled-error-button').click(unhandledError);
    $('.js-wrapped-method-error-button').click(wrapedMethodError);

    function methodToWrap(){
        throw new Error('Error from wrapped method');
    }

    function  unhandledError (){
        throw new Error('Unhandled Error');
    }

    function  handledError (){
        throw new Error('Some handled Error');
    }

    function  wrapedMethodError (){
        methodToWrap();
    }

})();