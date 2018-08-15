module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        'create-windows-installer': {
            x64: {
                appDirectory: 'G:/GitHub/Firebot/dist/Firebot-win32-x64',
                outputDirectory: 'G:/GitHub/Firebot/dist/installer64',
                loadingGif: 'G:/GitHub/Firebot/gui/images/animated.gif',
                iconUrl: 'https://crowbartools.com/projects/firebot/logo.ico',
                setupIcon: 'G:/GitHub/Firebot/gui/images/logo.ico'
            }
        },
		'jsdoc' : {
            src: [
                './main.js',
                './lib',
                './gui',
                './api',
                './resources'
            ],
            options: {
                destination: 'doc',
                verbose: true,
                recurse: true
            }
		}
    });

    // Load installer builder.
    grunt.loadNpmTasks('grunt-electron-installer');
	
	// Generate our docs
	grunt.loadNpmTasks('grunt-jsdoc');

};