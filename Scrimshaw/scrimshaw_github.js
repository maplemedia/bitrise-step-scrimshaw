const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}
const axios = require("axios");

async function fetchModuleDefinition(moduleName, moduleVersion, platform) {
  var moduleDefinition;
  if (process.env.hasOwnProperty("IBS")){
    var IBS = JSON.parse(process.env.IBS);
    if(IBS.hasOwnProperty("github_token")){
      const axiosGithub = axios.create({ baseURL: "https://api.github.com" });
      axiosGithub.defaults.headers.common["Authorization"] = `token ` + IBS.github_token;
      await axiosGithub
        .get(`/repos/maplemedia/${moduleName}/contents/ivory_module_definition_${platform}.json`, {
          params: {
            // Get specific git tag.
            ref: moduleVersion,
          },
        })
        .then(function (response) {
          moduleDefinition = JSON.parse(Buffer.from(response.data.content, response.data.encoding).toString());
        })
        .catch(function (error) {
          throw new Error(`Unable to download ivory_module_definition_${platform}.json for module [${moduleName}]. Please check if module version tag [${moduleVersion}] exists.\nError:[${error}]`);
        })
        .then(function () {});
    } else {
      console.log("Missing github_token in IBS");
    }
  }
  return moduleDefinition;
}

module.exports = {
  fetchModuleDefinition
};