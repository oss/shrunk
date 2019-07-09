pipeline {
    agent none

    stages {
        stage('build python packages') {
            agent {
                docker {
                    image 'maguro.oss.rutgers.edu/library/pybuild:0.1'
                }
            }

            steps {
		sh 'make clean all'
                stash name: 'shrunk_packages', includes: 'shrunk/dist/*'
                archiveArtifacts artifacts: 'shrunk/dist/*', fingerprint: true

		stash name: 'shrunk_test_packages', includes: 'shrunk_test/dist/*'
                archiveArtifacts artifacts: 'shrunk_test/dist/*', fingerprint: true
            }
        } // end build python packages

        stage('build docker images') {
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
                    WHL_NAME = sh(script: 'ls shrunk/dist | grep whl', returnStdout: true).trim()
                }
		sh "WHL_NAME=$WHL_NAME make build push"
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
                    SHRUNK_WHL_NAME = sh(script: 'ls shrunk_test/dist | grep test | grep whl',
                                         returnStdout: true).trim()
                }
                sh "sed -i -e \"/config\\.py/d\" docker-compose.${GIT_COMMIT}.yml"
                sh 'docker-compose -f docker-compose.$GIT_COMMIT.yml up -d'
                sh "./run_tests.sh docker-compose.${GIT_COMMIT}.yml shrunk_test/dist/$SHRUNK_WHL_NAME"
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
