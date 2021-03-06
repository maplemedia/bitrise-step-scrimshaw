const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}

var shell = require("shelljs");
const plist = require("plist");
const semver = require("semver");
const fs = require("fs");

async function commitChanges() {
  var result = {
    isValid: true,
    errors: [],
  };

  const ibcLoader = require("./scrimshaw_ibc");
  IBC = ibcLoader.loadIBC();

  if (IBC.hasOwnProperty("xcodeproj_path") && IBC.hasOwnProperty("plist_path")) {
    const filePath = process.env.BITRISE_SOURCE_DIR + "/" + IBC.plist_path;
    var loadedPlist = plist.parse(fs.readFileSync(filePath, "utf8"));
    if (loadedPlist.hasOwnProperty("CFBundleShortVersionString")) {
      // Increment patch version.
      var appVersion = loadedPlist["CFBundleShortVersionString"];

      if (appVersion === "$(MARKETING_VERSION)") {
        // Fetch MARKETING_VERSION from xcode.
        // ref: https://medium.com/flawless-app-stories/how-to-handle-marketing-version-of-xcode-11-by-ci-db64a0ac71b9
        var getAppVersion = shell.exec(`sed -n '/MARKETING_VERSION/{s/MARKETING_VERSION = //;s/;//;s/^[[:space:]]*//;p;q;}' ${process.env.BITRISE_SOURCE_DIR}/${IBC.xcodeproj_path}/project.pbxproj`);
        if (getAppVersion.code === 0) {
          appVersion = getAppVersion.stdout;
          appVersion = appVersion.replace("\n", "");
        } else {
          result.isValid = false;
          result.errors.push(`Unable to fetch app version from plist and xcode. stderr:${getAppVersion.stderr}`);
        }
      }

      if (semver.valid(appVersion)) {
        appVersion = semver.inc(appVersion, "patch");
        console.log(`Increasing app version [${loadedPlist["CFBundleShortVersionString"]}->${appVersion}]`);
        loadedPlist["CFBundleShortVersionString"] = appVersion;
      } else {
        result.isValid = false;
        result.errors.push(`Invalid format [${filePath}:CFBundleShortVersionString]=${appVersion} as semantic version, more info https://semver.org/`);
      }
    } else {
      result.isValid = false;
      result.errors.push(`Cannot find CFBundleShortVersionString key in app's plist at:[${filePath}]`);
    }

    // Increment bundle version.
    if (loadedPlist.hasOwnProperty("CFBundleVersion")) {
      var bundleVersionValue = loadedPlist["CFBundleVersion"];
      if (bundleVersionValue === "$(CURRENT_PROJECT_VERSION)") {
        // Fetch bundleVersionValue from xcode.
        // ref: https://stackoverflow.com/questions/56722677/how-to-read-current-app-version-in-xcode-11-with-script/
        var getBundleVersion = shell.exec(`sed -n '/CURRENT_PROJECT_VERSION/{s/CURRENT_PROJECT_VERSION = //;s/;//;s/^[[:space:]]*//;p;q;}' ${process.env.BITRISE_SOURCE_DIR}/${IBC.xcodeproj_path}/project.pbxproj`);
        if (getBundleVersion.code === 0) {
          bundleVersionValue = getBundleVersion.stdout;
          bundleVersionValue = getBundleVersion.replace("\n", "");
        } else {
          result.isValid = false;
          result.errors.push(`Unable to fetch app version from plist and xcode. stderr:${getAppVersion.stderr}`);
          throw result;
        }
      }

      var bundleVersion = parseInt(bundleVersionValue);
      console.log(`Increasing bundle version [${loadedPlist["CFBundleVersion"]}->${bundleVersion + 1}]`);
      bundleVersion++;
      loadedPlist["CFBundleVersion"] = bundleVersion.toString();
    } else {
      result.isValid = false;
      result.errors.push(`Cannot find CFBundleVersion key in app's plist at:[${filePath}]`);
    }

    if (result.isValid) {
      // Turn back into plist format for writing.
      var appliedPlist = plist.build(loadedPlist);
      fs.writeFileSync(filePath, appliedPlist);
      console.log(`Writing plist:[${filePath}]`);

      // Create a new branch for this build and commit all of the scrimshaw modifications to it.
      // If the build succeeds, the scrimshaw_push step will push all these changes to github.
      shell.pushd(process.env.BITRISE_SOURCE_DIR + "/" + IBC.proj_path);
      if (shell.exec('git config --global user.name "MapleMediaMachine"').code !== 0) throw new Error("Failed to set git user.name");
      if (shell.exec('git config --global user.email "maplemediacanada@gmail.com"').code !== 0) throw new Error("Failed to set git user.email");
      if (shell.exec(`git checkout -b Scrimshaw-${appVersion}`).code !== 0) throw new Error("Failed to git checkout branch");
      if (shell.exec(`git add --all`).code !== 0) throw new Error("git failed to add all changes");
      if (shell.exec(`git commit -am "Scrimshaw:[${appVersion}]:[${process.env.BITRISE_GIT_MESSAGE}]"`).code !== 0) throw new Error("git failed to commit");

      // Append BETA SCRIMSHAW to tag.
      if (shell.exec(`git tag -a ${appVersion}.S -m "Auto tag"`).code !== 0) throw new Error(`git failed to tag commit`);
    }
  } else {
    result.isValid = false;
    result.errors.push("Missing xcodeproj_path or plist_path in IBC");
  }

  if (!result.isValid) {
    throw result;
  }
}

module.exports = { commitChanges };
