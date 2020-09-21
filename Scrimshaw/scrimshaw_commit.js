const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
  throw dotEnvResult.error
}

const exec_cmd = require("./exec_cmd");

async function main() {
    var result =
    {
        isValid: true,
        errors: []
    };

    const ibcLoader = require("./scrimshaw_ibc");
    IBC = ibcLoader.loadIBC();

    if (IBC.hasOwnProperty('xcodeproj_path')) {
        // Create a new branch for this build and commit all of the scrimshaw modifications to it.
        // If the build succeeds, the scrimshaw_push step will push all these changes to github.
        await exec_cmd.execShellCommandProjDir(`fastlane add_plugin versioning`, IBC);
        await exec_cmd.execShellCommandProjDir(`fastlane run increment_version_number_in_xcodeproj bump_type:"patch" xcodeproj:"${IBC.xcodeproj_path}"`, IBC);
        await exec_cmd.execShellCommandProjDir(`fastlane run increment_build_number`, IBC);
        var newVersion = await exec_cmd.execShellCommandProjDir(`fastlane run get_version_number xcodeproj:"${IBC.xcodeproj_path}"`, IBC);
        await exec_cmd.execShellCommandSourceDir(`git config --global user.name "MapleMediaMachine"`);
        await exec_cmd.execShellCommandSourceDir(`git config --global user.email "maplemediacanada@gmail.com"`);
        await exec_cmd.execShellCommandSourceDir(`git checkout -b Scrimshaw-${newVersion}`);
        await exec_cmd.execShellCommandSourceDir(`git add --all`);
        await exec_cmd.execShellCommandSourceDir(`git commit -a -m "Scrimshaw:[${newVersion}]" -m "msg:[${process.env.BITRISE_GIT_MESSAGE}]"`);

        // Append BETA SCRIMSHAW to tag.
        await exec_cmd.execShellCommandSourceDir(`git tag -a ${newVersion}.B.S`);
    } else {
        result.isValid = false;
        result.errors.push('Missing xcodeproj_path in IBC');
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