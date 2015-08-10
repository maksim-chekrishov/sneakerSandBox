var browserify = require('browserify'),
    gulp = require('gulp'),
    source = require('vinyl-source-stream'),
    notify = require('gulp-notify'),
    helpers = require('../helpers');

gulp.task('browserify-sneaker', function() {
    var sourceFile = './app/src/sneakerCore.js',
        destFolder = './app/dest',
        destFile = 'sneaker.js';

    return browserify(sourceFile)
        .bundle()
        .on('error', helpers.handleBrowserifyError)
        .pipe(source(destFile))
        .pipe(gulp.dest(destFolder));
});