const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
  throw dotEnvResult.error
}

var shell = require('shelljs');
const plist = require('plist');
const axios = require("axios");

// Download module definitions from github.
const axiosGithub = axios.create({ baseURL: "https://api.github.com" });
axiosGithub.defaults.headers.common["Authorization"] = `token ` + process.env.GITHUB_TOKEN;

async function main() {
    var result =
    {
        isValid: true,
        errors: []
    };

    const ibcLoader = require("./scrimshaw_ibc");
    IBC = ibcLoader.loadIBC();


    // Only continue if we can push the PR to github. Otherwise, the push won't be as easy to merge.
    if (IBC.hasOwnProperty('github_owner') && IBC.hasOwnProperty('github_repo')) {
        // After build has passed, push all of the commits Scrimshaw has done to this project.
        // Grab the version so we can put it in the PR title.
        const filePath = process.env.BITRISE_SOURCE_DIR + "/" + IBC.plist_path;
        var loadedPlist = plist.parse(fs.readFileSync(filePath, 'utf8'));
        if (loadedPlist.hasOwnProperty('CFBundleShortVersionString')) {
          // Increment patch version.
          var appVersion = loadedPlist['CFBundleShortVersionString'];

          // Pushing the B tag will auto-trigger a publish workflow with this version.
          shell.pushd(process.env.BITRISE_SOURCE_DIR + "/" + IBC.proj_path);
          shell.exec(`git push --tags --set-upstream origin Scrimshaw-${appVersion}`);

          // Publish the PR using Github API
          // Ref: https://docs.github.com/en/rest/reference/pulls
          await axiosGithub.post(`/repos/${IBC.github_owner}/${IBC.github_repo}/pulls`,
          {
              params:
              {
                  // Required. The title of the new pull request.
                  title: `Scrimshaw-${appVersion}`,
                  // Required. The name of the branch where your changes are implemented.
                  head: `Scrimshaw-${appVersion}`,
                  // Required. The name of the branch you want the changes pulled into.
                  base: `${process.env.BITRISE_GIT_BRANCH}`,
                  // The contents of the pull request.
                  body: `${process.env.BITRISE_GIT_MESSAGE}`
              }
          })
          .then(function (response) {
          })
          .catch(function (error) {
              // handle error
              result.isValid = false;
              result.errors.push(`Unable to post PR! error:${error}`);
              console.log(error);
          })
          .then(function () {
      
          });
        } else {
          result.isValid = false;
          result.errors.push(`Cannot find CFBundleShortVersionString key in app's plist at:[${filePath}]`);
        }
        
    } else {
        result.isValid = false;
        result.errors.push('Missing values in IBC:[github_owner,github_repo]');
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