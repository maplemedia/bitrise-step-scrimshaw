const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}

var shell = require("shelljs");
const plist = require("plist");
const axios = require("axios");
const fs = require("fs");

async function pushAndCreatePR() {
  var result = {
    isValid: true,
    errors: [],
  };

  const ibcLoader = require("./scrimshaw_ibc");
  IBC = ibcLoader.loadIBC();

  // Only continue if we can push the PR to github. Otherwise, the push won't be as easy to merge.
  if (process.env.hasOwnProperty("BITRISEIO_GIT_REPOSITORY_OWNER") && process.env.hasOwnProperty("BITRISEIO_GIT_REPOSITORY_SLUG")) {
    // After build has passed, push all of the commits Scrimshaw has done to this project.
    // Grab the version so we can put it in the PR title.
    const filePath = process.env.BITRISE_SOURCE_DIR + "/" + IBC.plist_path;
    var loadedPlist = plist.parse(fs.readFileSync(filePath, "utf8"));
    if (loadedPlist.hasOwnProperty("CFBundleShortVersionString")) {
      // Increment patch version.
      var appVersion = loadedPlist["CFBundleShortVersionString"];

      // Pushing the B tag will auto-trigger a publish workflow with this version.
      shell.pushd(process.env.BITRISE_SOURCE_DIR + "/" + IBC.proj_path);
      if (shell.exec(`git push --tags --force --set-upstream origin Scrimshaw-${appVersion}`).code !== 0) throw new Error("Cannot push git branch");

      // Publish the PR using Github API
      // Ref: https://docs.github.com/en/rest/reference/pulls
      const axiosGithub = axios.create({ baseURL: "https://api.github.com" });
      axiosGithub.defaults.headers.common["Authorization"] = `token ` + JSON.parse(process.env.IBS).github_token;
      await axiosGithub
        .post(`/repos/${process.env.BITRISEIO_GIT_REPOSITORY_OWNER}/${process.env.BITRISEIO_GIT_REPOSITORY_SLUG}/pulls`, {
          // Required. The title of the new pull request.
          title: `Scrimshaw-${appVersion}`,
          // Required. The name of the branch where your changes are implemented.
          head: `Scrimshaw-${appVersion}`,
          // Required. The name of the branch you want the changes pulled into.
          base: `${process.env.BITRISE_GIT_BRANCH}`,
          // The contents of the pull request.
          body: `${process.env.BITRISE_GIT_MESSAGE}`,
        })
        .then(function (response) {})
        .catch(function (error) {
          // handle error
          result.isValid = false;
          result.errors.push(`Unable to post PR! error:${error}`);
          console.log(error);
        })
        .then(function () {});

      // Start the publish build for this .S tag.
      const bitrise = require("./scrimshaw_bitrise");
      await bitrise.startBuildWithTag(`${appVersion}.S`);

      // Post slack message that the PR has been created and build has started.
      var slackMessage = `:memo:${process.env.BITRISE_APP_TITLE} pull request has been created:\nhttps://github.com/${process.env.BITRISEIO_GIT_REPOSITORY_OWNER}/${process.env.BITRISEIO_GIT_REPOSITORY_SLUG}/pulls\n`;
      slackMessage += `Publish build for app version [${appVersion}.S] has started on github using the [${IBC.bitrise_publish_workflow}] workflow.`;

      const slackStep = require("./scrimshaw_slack");
      await slackStep.postMessage(slackMessage);
    } else {
      result.isValid = false;
      result.errors.push(`Cannot find CFBundleShortVersionString key in app's plist at:[${filePath}]`);
    }
  } else {
    result.isValid = false;
    result.errors.push("Missing values in environment:[BITRISEIO_GIT_REPOSITORY_OWNER,BITRISEIO_GIT_REPOSITORY_SLUG]");
  }

  if (!result.isValid) {
    throw result;
  }
}

module.exports = { pushAndCreatePR };
