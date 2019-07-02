pipeline {
    agent none

    stages {
        stage('build python packages') {
            agent {
                docker {
                    image 'maguro.oss.rutgers.edu/library/pybuild'
                }
            }

            steps {
                sh 'pip3.6 install -r pip.req'
                sh 'pip3.6 install -r pip.req.dev'
                sh 'pip3.6 install wheel'
                sh 'cp shrunk/config.py.example shrunk/config.py'
                sh 'LANG=en_US.utf8 FLASK_APP=shrunk flask assets build'
                sh './setup.py sdist bdist_wheel'
                script {
                    SHRUNK_WHL_NAME = sh(script: 'ls dist | grep whl', returnStdout: true).trim()
                    SHRUNK_DIR_NAME = sh(script: 'ls dist | grep whl | cut -d- -f1,2',
                                         returnStdout: true).trim()
                }
		dir("dist") {
                    sh "wheel unpack ${SHRUNK_WHL_NAME}"
                    sh "rm ${SHRUNK_DIR_NAME}/shrunk/config.py"
                    sh "wheel pack ${SHRUNK_DIR_NAME}"
                    sh "rm -rf ${SHRUNK_DIR_NAME}"
                }
                stash name: 'packages', includes: 'dist/*'
            }
        }

        stage('build docker containers') {
            agent any

            steps {
                git url: 'ssh://em-oss-phab@vault.phacility.com/source/docker-shrunk.git',
                    branch: 'jenkins',
                    credentialsId: 'em-oss-phab.phacility.com'
                unstash name: 'packages'
                sh "cp docker-compose.yml docker-compose.${GIT_COMMIT}.yml"
                sh "sed -i -e \"s/APP_TAG/$GIT_COMMIT/g\" docker-compose.${GIT_COMMIT}.yml"
                sh "sed -i -e \"s/HTTPD_TAG/$GIT_COMMIT/g\" docker-compose.${GIT_COMMIT}.yml"
                script {
                    SHRUNK_WHL_NAME = sh(script: 'ls dist | grep whl', returnStdout: true).trim()
                }
                sh "sed -i -e \"s/SHRUNK_WHL_NAME/$SHRUNK_WHL_NAME/g\" app/Dockerfile"
                sh "cp dist/$SHRUNK_WHL_NAME app"
                sh 'docker-compose -f docker-compose.$GIT_COMMIT.yml build'
                sh 'docker-compose -f docker-compose.$GIT_COMMIT.yml push'
                archiveArtifacts artifacts: 'docker-compose.*.yml', fingerprint: true
                archiveArtifacts artifacts: 'dist/*', fingerprint: true
            }

            post {
                always {
                    deleteDir()
                }
            }
        }
    }
}
