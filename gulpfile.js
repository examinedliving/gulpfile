/**
 * gulpfile.js
 * @description A custom gulpfile that can be reused without
 * modification (provided something new isn't needed) by reading
 * from a config file and from package.json.
 *
 * @author  Daniel Gombert
 *
 * @requires gulp, gulp-load-plugins,gulp-plumber,gulp-livereload
 * gulp-less, gulp-rename, gulp-sourcemaps, gulp-preprocess,
 * gulp-uglify, gulp-util, gulp-autoprefixer, gulp-minify-css,
 * gulp-replace, gulp-jade, gulp-run, gulp-data
 *
 * created with "gulp":"3.8.11"
 */

var gulp = require('gulp');
var path = require('path');
var config = require(path.join(__dirname, '\\config\\config.js'));

/*==================================================================
    plugins becomes an object populated with shorthand variable versions of all gulp plugins in package.json file
  =================================================================*/

var plugins = require('gulp-load-plugins')({
    rename: {
        'gulp-autoprefixer': 'prefix',
    }
});

/*==================================================================
    onError - callback for gulp-plumber error logger.  Receives error object as parameter passed from gulp-plumber.
  =================================================================*/

var onError = function(e) {
    console.log(e);
};

/*==================================================================
    default - executes watch task by call `gulp` from cli
  =================================================================*/

gulp.task('default', ['watch']);

/*==================================================================
    less_vendor - concats all the variables from vendors that I do not want included in the main styles.css file
  =================================================================*/

gulp.task('less_vendor', function() {

    gulp.src(config.process.less_vendor)
        .pipe(plugins.plumber({
            errorHandler: onError
        }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.less())
        .pipe(plugins.prefix())
        .pipe(config.envtype === 'production' ? plugins.minify() : plugins.util.noop())
        .pipe(config.envtype === 'production' ? plugins.rename('vendor.min.css') : plugins.util.noop())
        .pipe(plugins.sourcemaps.write('./maps'))
        .pipe(gulp.dest(config.dist.css_path))
        .pipe(plugins.livereload());
});

/*==================================================================
    less - processes less from single file
  =================================================================*/

gulp.task('less', function() {
    gulp.src(config.process.less)
        .pipe(plugins.plumber({
            errorHandler: onError
        }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.less())
        .pipe(plugins.prefix())
        .pipe(config.envtype === 'production' ? plugins.minify() : plugins.util.noop())
        .pipe(plugins.rename('style.css'))
        .pipe(plugins.sourcemaps.write('./css/maps'))
        .pipe(gulp.dest(config.dist_root))
        .pipe(plugins.livereload());
});

/*==================================================================
    jade - process jade, but first calls gulp.data to get json as variables **
  =================================================================*/

gulp.task('jade', function() {
    gulp.src(config.watch.jade, {
        base: process.cwd()
    })
        .pipe(plugins.plumber())
        .pipe(plugins.data(function() {
            return require(config.locals);
        }))
        .pipe(plugins.jade({
            pretty: true
        }))
        .pipe(plugins.rename({
            'extname': '.php'
        }))
        .pipe(gulp.dest(config.dist_root));
});

/*==================================================================
    Refresh - A task to fire after jade completes with a mild using gulp-wait and live reload - this prevents multiple reloads
  =================================================================*/

gulp.task('refresh', function() {
    gulp.src(config.dist.changed)
        .pipe(plugins.wait(200))
        .pipe(plugins.livereload());
});


/*==================================================================
    js - preprocesses, concats, and minifies if production environment the main js file - no vendor stuff
  =================================================================*/

gulp.task('js', function() {

    gulp.src(config.process.js, {
        base: config.process_root
    })
        .pipe(plugins.plumber({
            errorHandler: onError
        }))
        .pipe(config.envtype === 'production' ? plugins.uglify() : plugins.util.noop())
        .pipe(plugins.preprocess())
        .pipe(gulp.dest(config.dist.js_path));
});

/*==================================================================
    functions - processes functions.php after preprocessing files have had the <?php & ?> tags stripped
  =================================================================*/

gulp.task('functions', function() {
    gulp.src(config.process.php)
        .pipe(plugins.plumber({
            errorHandler: onError
        }))
        .pipe(plugins.preprocess())
        .pipe(gulp.dest(config.dist_root))
        .pipe(plugins.livereload());
});

/*==================================================================
    watch - watches pp (preprocess) files, less files, js files, and php for change, and then fires a callback - either task or function
  =================================================================*/

gulp.task('watch', function() {

    plugins.livereload.listen();

    /*==============================================================
        watched file groups - defined in ./config/config.json & ./config/config.js - fire callback task in square brackets
    ==============================================================*/

    gulp.watch(config.watch.jade, ['jade']);
    gulp.watch(config.watch.js, ['js']);
    gulp.watch(config.watch.less, ['less']);
    gulp.watch(config.watch.less_vendor, ['less_vendor']);
    gulp.watch(config.watch.php, ['functions']);
    gulp.watch(config.dist.php, ['refresh']);

    /*==============================================================
        pp - preprocess files for use with gulp-preprocess they have a distinct extension, because they need to have php "<?php" & "?>" tags stripped prior to being preprocess (included) in functions.php file - each file holds individual or group of functions and is imported from functions.php
    ==============================================================*/

    var pp = gulp.watch(config.watch.pp);
    var command = 'touch ' + config.process.php;
    pp.on('change', function(event) {
        gulp.src(event.path)
            .pipe(plugins.rename({
                'extname': '.pp'
            }))
            .pipe(plugins.replace(/(<\?php)|(\?>)/g, ''))
            .pipe(plugins.replace(/\.ppp/g, '.pp'))
            .pipe(gulp.dest(config.process.pp_path))
            .pipe(plugins.run(command));
    });

    var php = gulp.watch(config.watch.all_php);
    php.on('change', function(event) {
        gulp.src(event.path, {
            base: process.cwd()
        })
            .pipe(plugins.rename(plugins.util.noop()))
            .pipe(gulp.dest(config.dist_root));
    });
});

module.exports = gulp;