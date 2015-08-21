var gulp = require('gulp'),
	shell = require('gulp-shell'),
	compass = require('gulp-compass'),
	minifyCSS = require('gulp-minify-css'),
	sourcemaps = require("gulp-sourcemaps"),
	rename = require("gulp-rename"),
	autoprefixer = require("gulp-autoprefixer"),
	imagemin = require('gulp-imagemin'),
	pngquant = require('imagemin-pngquant'),
	newer = require('gulp-newer'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	notify = require('gulp-notify'),
	autopolyfiller = require('gulp-autopolyfiller'),
	plumber = require('gulp-plumber'),
	csslint = require('gulp-csslint'),
	jshint = require('gulp-jshint'),
	browserSync = require('browser-sync'),
	filter = require('gulp-filter'),
	reload = browserSync.reload,
	resolveDependencies = require('gulp-resolve-dependencies');

//Variables that will be set by build.sh
var hostname = "dev.tt.nl";

//Variables for building
var supportedBrowsers = ['last 3 versions','ie 8','ie 9','ie 10','ie 11','> 1%'];

//Task to call our bash script to install wordpress
gulp.task('install', shell.task([
  'scripts/build.sh',
  'gulp watch'
]));

//Error notification
var onError = function(err,task) {
	var message = err.plugin || err.message || err;
	console.log(err);
	notify.onError({
		'title': 'Error executing '+task,
		'subtitle': message,
		'message': 'Check the Terminal for more information.',
		'sound':  'Hero',
		'icon': false, // Set icon? (Absolute path to image)
		'contentImage': false, // Attach image? (Absolute path)
		'open': 0, // URL to open on click
		'wait': false, // if wait for notification to end
		'sticky':true
	})(err);

};
//Task to compile scss files to css and run through autoprefixer
gulp.task('compass', function() {
	return gulp.src('frontend/scss/**/*.scss')
		.pipe(plumber({errorHandler: function(err){
			onError(err,'Compass')
			this.emit('end');
		}}))
		.pipe(compass({
			sass: 'frontend/scss/',
			css: 'frontend/css/',
			image: 'frontend/images'
		}))
		.pipe(autoprefixer({
            browsers: supportedBrowsers,
        }))
		.pipe(gulp.dest('./frontend/css'))
});
//Task to minify css files and write to theme folder
gulp.task('css',['compass'], function() {
	return gulp.src('frontend/css//*.css')
		.pipe(plumber({errorHandler: function(err){
			onError(err,'CSS')
			this.emit('end');
		}}))
	    .pipe(sourcemaps.init())
	    .pipe(minifyCSS())
	    .pipe(sourcemaps.write())
	    .pipe(rename({suffix: '.min'}))
	    .pipe(gulp.dest('public_html/css'))
	    .pipe(filter('**/*.css'))
	  	.pipe(reload({stream: true}));
});

//Image optimisation
gulp.task('imageoptim', function () {
    return gulp.src('frontend/images/**/*')
    	.pipe(plumber({errorHandler: function(err){
			onError(err,'Imageoptim')
			this.emit('end');
		}}))
		.pipe(newer('public_html/images'))
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
    .pipe(gulp.dest('public_html/images'))
    .pipe(gulp.dest('frontend/images'))
});

//JS library handling
gulp.task('js-libraries', function () {
	return gulp.src(['frontend/js/libs/libs.js'])
		.pipe(plumber({errorHandler: function(err){
			onError(err,'JS Libraries')
			this.emit('end');
		}}))
		.pipe(resolveDependencies({
      		pattern: /\* @requires [\s-]*(.*\.js)/g
    	}))
		.pipe(sourcemaps.init())
		.pipe(concat('libraries.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
    	.pipe(gulp.dest('public_html/js'))
});

//JS classes/default handling
gulp.task('js', function () {
	return gulp.src(['frontend/js/polyfills/*.js','frontend/js/classes/*.js','frontend/js/*.js'])
		.pipe(plumber({errorHandler: function(err){
			onError(err,'JS')
			this.emit('end');
		}}))
		.pipe(sourcemaps.init())
		.pipe(uglify())
		.pipe(concat('default.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
    	.pipe(gulp.dest('public_html/js'))
});


//Generate polyfills for js classes and js files using our supportedbrowsers variable
gulp.task('polyfills', function () {
	return gulp.src(['frontend/js/classes/*.js','frontend/js/*.js'])
		.pipe(plumber({errorHandler: function(err){
			onError(err,'Polyfills')
			this.emit('end');
		}}))
		.pipe(autopolyfiller('polyfills.js',{ browsers: supportedBrowsers }))
		.pipe(gulp.dest('frontend/js/polyfills'))
		.pipe(reload());
});
//Fonts
gulp.task('fonts',function(){
	return gulp.src('frontend/fonts/**/**')
		.pipe(plumber({errorHandler: function(err){
				onError(err,'FONTS')
				this.emit('end');
			}}))
		.pipe(gulp.dest('public_html/fonts'))
})

//JS hint
gulp.task('jshint',function(){
	return gulp.src(['frontend/js/classes/*.js','frontend/js/polyfills/*.js','frontend/js/*'])
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
})
//CSS hint
gulp.task('csshint',function(){
	return gulp.src('frontend/css/*.css')
		.pipe(csslint({
			'box-model':false,
			'unique-headings':false,
			'font-sizes':false,
			'outline-none':false,
			'qualified-headings':false,
		}))
		.pipe(csslint.reporter());
})
gulp.task('reload',function(){
	reload();
})

//Watch task
gulp.task('watch',function(){
	browserSync({
        proxy: hostname,
    });
	gulp.watch('frontend/fonts/**/**',['fonts','reload'])
	gulp.watch('frontend/scss/**/**.scss',['css'])
	gulp.watch('frontend/images/**/*',['imageoptim','reload'])
	gulp.watch('frontend/js/libs/*.js',['js-libraries','reload'])
	gulp.watch(['frontend/js/classes/*.js','frontend/js/polyfills/*.js','frontend/js/*.js'],['js','reload'])
	gulp.watch(['public_html/*.php','public_html/*.html'],['reload'])
});