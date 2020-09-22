const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
  throw dotEnvResult.error
}

var shell = require('shelljs');
const plist = require('plist');
const semver = require('semver');
const fs = require('fs');

async function main() {
    var result =
    {
        isValid: true,
        errors: []
    };

    const ibcLoader = require("./scrimshaw_ibc");
    IBC = ibcLoader.loadIBC();

    if (IBC.hasOwnProperty('xcodeproj_path') && IBC.hasOwnProperty('plist_path')) {
        const filePath = process.env.BITRISE_SOURCE_DIR + "/" + IBC.plist_path;
        var loadedPlist = plist.parse(fs.readFileSync(filePath, 'utf8'));
        if (loadedPlist.hasOwnProperty('CFBundleShortVersionString')) {
          // Increment patch version.
          var appVersion = loadedPlist['CFBundleShortVersionString'];
          if (semver.valid(appVersion)) {
            appVersion = semver.inc(appVersion, 'patch');
            console.log(`Increasing app version [${loadedPlist['CFBundleShortVersionString']}->${appVersion}]`);
            loadedPlist['CFBundleShortVersionString'] = appVersion;
          } else {
            result.isValid = false;
            result.errors.push(`Invalid format [${filePath}:CFBundleShortVersionString]=${appVersion} as semantic version, more info https://semver.org/`);
          }
        } else {
          result.isValid = false;
          result.errors.push(`Cannot find CFBundleShortVersionString key in app's plist at:[${filePath}]`);
        }

        // Increment bundle version.
        if (loadedPlist.hasOwnProperty('CFBundleVersion')) {
          var bundleVersion = parseInt(loadedPlist['CFBundleVersion']);
          console.log(`Increasing bundle version [${bundleVersion}->${bundleVersion+1}]`);
          bundleVersion++;
          loadedPlist['CFBundleVersion'] = bundleVersion.toString();
        } else {
          result.isValid = false;
          result.errors.push(`Cannot find CFBundleVersion key in app's plist at:[${filePath}]`);
        }

        if (result.isValid) {
          // Turn back into plist format for writing.
          var appliedPlist = plist.build(loadedPlist)
          fs.writeFileSync(filePath, appliedPlist);
          console.log(`Writing plist:[${filePath}]`);

          // Create a new branch for this build and commit all of the scrimshaw modifications to it.
          // If the build succeeds, the scrimshaw_push step will push all these changes to github.
          shell.pushd(process.env.BITRISE_SOURCE_DIR + "/" + IBC.proj_path);
          shell.exec(`git config --global user.name "MapleMediaMachine"`);
          shell.exec(`git config --global user.email "maplemediacanada@gmail.com"`);
          shell.exec(`git config --global core.editor /usr/bin/vim`);
          shell.exec(`git checkout -b Scrimshaw-${appVersion}`);
          shell.exec(`git add --all`);
          shell.exec(`git commit -a -m 'Scrimshaw:[${appVersion}]:[${process.env.BITRISE_GIT_MESSAGE}]'`);
  
          // Append BETA SCRIMSHAW to tag.
          shell.exec(`git tag -a ${appVersion}.B.S`);
        }
    } else {
        result.isValid = false;
        result.errors.push('Missing xcodeproj_path or plist_path in IBC');
    }

    if (!result.isValid){
        throw result;
    }
}

(async () => {
    try {
      await main();
    }
    catch (e) {
      console.log(e);
  
      if (e.hasOwnProperty('errors')) {
        console.log("Errors:")
        for (var i = 0; i < e.errors.length; i++) {
          console.log(e.errors[i]);
        }
      }
  
      // Throw to bitrise
      throw e;
    }
  
    return 0;
  })();