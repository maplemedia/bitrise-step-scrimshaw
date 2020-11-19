const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
  throw dotEnvResult.error
}

const axios = require("axios");

function getAdBidderDefinition(moduleDefinition, platform, adBidderName) {
    const platformModuleDefinition = getModuleDefinitionForPlatform(moduleDefinition, platform);
    if(platformModuleDefinition.hasOwnProperty('ad_bidders')){
      return platformModuleDefinition.ad_bidders.find(element => element.name === adBidderName);
    } else {
      return null;
    }
}

function getAdNetworkDefinition(moduleDefinition, platform, adNetworkName) {
    const platformModuleDefinition = getModuleDefinitionForPlatform(moduleDefinition, platform);
    return platformModuleDefinition.ad_networks.find(element => element.name === adNetworkName);
}

function getModuleDefinitionForPlatform(moduleDefinition, platform) {
    return moduleDefinition.platforms.find(element => element.name === platform);
}

async function attachDefinitions(IBC) {
    for (var moduleConfig of IBC.modules) {
        const moduleDefinition = await fetchModuleDefinition(moduleConfig);

        // Attach the config's definition.
        moduleConfig.definition = moduleDefinition;
    }
}

async function fetchModuleDefinition(moduleConfig) {
    var moduleDefinition;
    const axiosGithub = axios.create({ baseURL: "https://api.github.com" });
    axiosGithub.defaults.headers.common["Authorization"] = `token ` + JSON.parse(process.env.IBS).github_token;
    await axiosGithub.get(`/repos/maplemedia/${moduleConfig.name}/contents/ivory_module_definition.json`,
    {
        params:
        {
            // Get specific git tag.
            ref: moduleConfig.version
        }
    })
    .then(function (response) {
        moduleDefinition = JSON.parse(Buffer.from(response.data.content, response.data.encoding).toString());
    })
    .catch(function (error) {
        throw new Error(`Unable to download ivory_module_definition.json for module [${moduleConfig.name}]. Please check if module version tag [${moduleConfig.version}] exists.\nError:[${error}]`);
    })
    .then(function () {

    });
    return moduleDefinition;
}

function loadIBC() {
    const fs = require('fs');
    
    if (!('BITRISE_SOURCE_DIR' in process.env)) {
      throw new Error('The [BITRISE_SOURCE_DIR] environment variable is missing. If you are running locally (not bitrise) please define it in the .env file.');
    }

    var IBCPath = "";
    // Write the IBC to the root of the bitrise source dir.
    if ('IBC' in process.env) {
      // When working with CI, write the IBC to the workspace so it's versionned.
      IBCPath = process.env.BITRISE_SOURCE_DIR + "/ivory_build_config.json";
      console.log(`Writing [${IBCPath}] from 'IBC' Environment Variable.`);
      fs.writeFileSync(IBCPath, process.env.IBC);
    } else if ('IBC_PATH' in process.env) {
      // IBC is local with a path.
      IBCPath = process.env.IBC_PATH;
    } else {
      throw new Error('Invalid workflow parameters, you must either have an "IBC" or "IBC_PATH" environment variable in your environment to run.');
    }
  
    // Read the IBC from the root of the source dir.
    // NOTE: This is important so the build process does not depend on environment variables but rather
    // files on IO so it can be loaded from github PRs and other sources.
    // An example of this is once the IBC is applied/validated, the github PR generated by Scrimshaw
    // will no longer depend on the process.env IBC but rather the locally stored ivory_build_config.json file.
    var rawBuildConfig = fs.readFileSync(IBCPath);
    return JSON.parse(rawBuildConfig);
}

module.exports = { loadIBC, attachDefinitions, getAdBidderDefinition, getAdNetworkDefinition, getModuleDefinitionForPlatform };