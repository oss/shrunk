pipeline {
    agent none

    stages {
        stage('./setup.py sdist bdist_wheel') {
            agent {
                docker {
                    image 'maguro.oss.rutgers.edu/library/pybuild:0.1'
                }
            }

            steps {
		dir ("shrunk") {
                    sh 'cp shrunk/config.py.example shrunk/config.py'
                    sh 'LANG=en_US.utf8 FLASK_APP=shrunk flask assets build'
                    sh './setup.py sdist bdist_wheel'
                    script {
                        SHRUNK_WHL_NAME = sh(script: 'ls dist | grep whl',
			                     returnStdout: true).trim()
                        SHRUNK_DIR_NAME = sh(script: 'ls dist | grep whl | cut -d- -f1,2',
                                             returnStdout: true).trim()
                    }
		    dir("dist") {
                        sh "wheel unpack ${SHRUNK_WHL_NAME}"
                        sh "rm ${SHRUNK_DIR_NAME}/shrunk/config.py"
                        sh "wheel pack ${SHRUNK_DIR_NAME}"
                        sh "rm -rf ${SHRUNK_DIR_NAME}"
                    }
                    stash name: 'shrunk_packages', includes: 'dist/*'
                    archiveArtifacts artifacts: 'dist/*', fingerprint: true
		}

                dir ("shrunk_test") {
		    sh './setup.py sdist bdist_wheel'
		    stash name: 'shrunk_test_packages', includes: 'dist/*'
                    archiveArtifacts artifacts: 'dist/*', fingerprint: true
		}
            } // end steps
        } // end build python packages

        stage('docker-compose build') {
            agent any

            environment {
	        DC = credentials('harbor_shrunk')
            }

            steps {
                git url: 'ssh://em-oss-phab@vault.phacility.com/source/docker-shrunk.git',
                    branch: 'jenkins',
                    credentialsId: 'em-oss-phab.phacility.com'
                unstash name: 'shrunk_packages'
                script {
                    SHRUNK_WHL_NAME = sh(script: 'ls dist | grep -v test | grep whl',
		                         returnStdout: true).trim()
                }
                sh "cp docker-compose.yml docker-compose.${GIT_COMMIT}.yml"
                sh "sed -i -e \"s/APP_TAG/$GIT_COMMIT/g\" docker-compose.${GIT_COMMIT}.yml"
                sh "sed -i -e \"s/HTTPD_TAG/$GIT_COMMIT/g\" docker-compose.${GIT_COMMIT}.yml"
                sh "sed -i -e \"s/SHRUNK_WHL_NAME/$SHRUNK_WHL_NAME/g\" app/Dockerfile"
                sh "cp dist/$SHRUNK_WHL_NAME app"
                sh 'docker-compose -f docker-compose.$GIT_COMMIT.yml build'
		sh 'docker login --username=$DC_USR --password=$DC_PSW maguro.oss.rutgers.edu'
                sh 'docker-compose -f docker-compose.$GIT_COMMIT.yml push'
		stash name: 'docker-compose', includes: 'docker-compose.*.yml'
                archiveArtifacts artifacts: 'docker-compose.*.yml', fingerprint: true
            } // end steps

            post {
	        failure {
		    deleteDir()
		}
	    }
        } // end build docker containers

        stage('pytest') {
	    agent any

            steps {
                git url: 'ssh://em-oss-phab@vault.phacility.com/source/docker-shrunk.git',
                    branch: 'jenkins',
                    credentialsId: 'em-oss-phab.phacility.com'
		unstash name: 'docker-compose'
		unstash name: 'shrunk_test_packages'
                script {
                    SHRUNK_WHL_NAME = sh(script: 'ls dist | grep test | grep whl',
		                         returnStdout: true).trim()
                }
		sh "sed -i -e \"/config\\.py/d\" docker-compose.${GIT_COMMIT}.yml"
	        sh 'docker-compose -f docker-compose.$GIT_COMMIT.yml up -d'
		sh "./run_tests.sh docker-compose.${GIT_COMMIT}.yml dist/$SHRUNK_WHL_NAME"
            }

            post {
	        always {
		    sh 'echo docker-compose -f docker-compose.$GIT_COMMIT.yml down -v'
		    junit testResults: 'junit.xml'
		    deleteDir()
		}
            }
        } // end run docker containers
    } // end stages
} // end pipeline
