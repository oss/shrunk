module.exports = function(grunt) {

    grunt.initConfig({
        watch: {
            styles: {
                files: ['**/*.scss'],
                tasks: 'sass'
            } 
        },

        sass: {
            dist: {
                 options: {
                    style: 'compressed'       
                 },

                 files: {
                     'shrunk/static/css/shrunk.css': 'shrunk/static/css/importer.scss'
                 }
             }            
        },

        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },

                files: {
                    'shrunk/templates/dist/index.html': 'shrunk/templates/src/index.html' // todo
                }
            }
        }
	});
 
    
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');

    grunt.registerTask('default', ['sass', 'watch']);
}
