const exec = require('child_process').exec;

function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            throw new Error(error);
        }
            resolve(stdout? stdout : stderr);
        });
    });
}

function execShellCommandSourceDir(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: process.env.BITRISE_SOURCE_DIR }, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            throw new Error(error);
        }
            resolve(stdout? stdout : stderr);
        });
    });
}

function execShellCommandProjDir(cmd, IBC) {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: process.env.BITRISE_SOURCE_DIR + IBC.proj_path }, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            throw new Error(error);
        }
            resolve(stdout? stdout : stderr);
        });
    });
}

module.exports = { execShellCommand, execShellCommandSourceDir, execShellCommandProjDir };