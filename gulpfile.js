var gulp = require('gulp');
var bs = require('browser-sync').create(); // create a browser sync instance.

gulp.task('default', ['browser-sync']);

gulp.task('browser-sync', function () {
  bs.init({
    server: {
      baseDir: './src'
    }
  });
});
