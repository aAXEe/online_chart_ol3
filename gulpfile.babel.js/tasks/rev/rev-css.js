var config = require('../../config')
var gulp = require('gulp')
var cleanCSS = require('gulp-clean-css')
var path = require('path')
var rev = require('gulp-rev')
var revNapkin = require('gulp-rev-napkin')

// 4) Rev and compress CSS and JS files (this is done after assets, so that if a
//    referenced asset hash changes, the parent hash will change as well
gulp.task('rev-css', function () {
  return gulp.src(path.join(config.root.dest, '/**/*.css'))
    .pipe(rev())
    .pipe(cleanCSS())
    .pipe(gulp.dest(config.root.dest))
    .pipe(revNapkin({verbose: false}))
    .pipe(rev.manifest(path.join(config.root.dest, 'rev-manifest.json'), {merge: true}))
    .pipe(gulp.dest(''))
})
