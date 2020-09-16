const axios = require("axios");

// Download module definitions from github.
const axiosGithub = axios.create({ baseURL: "https://api.github.com" });
axiosGithub.defaults.headers.common["Authorization"] = `token ` + process.env.GITHUB_TOKEN;

function validateAdsModule(IBC, moduleConfig, moduleDefinition) {
    var result =
    {
        isValid: true,
        errors: []
    };

    var currentPlatformDefinition = moduleDefinition.platforms.find(element => element.name === IBC.platform);

    // Validate network exists and if the required ID is 
    for (var i = 0; i < moduleConfig.ad_networks.length; i++) {
        var adNetworkConfig = moduleConfig.ad_networks[i];
        const adNetworkDefinition = currentPlatformDefinition.ad_networks.find(element => element.name === adNetworkConfig.name);

        if (adNetworkDefinition) {
            // Check if this network requires an ID.
            if (adNetworkDefinition.hasOwnProperty('id')) {
                if (adNetworkConfig.hasOwnProperty('id')) {
                    // Add the definitions id to the ad network config json for later use when applying.
                    adNetworkConfig.id_key = adNetworkDefinition.id;
                }
                else {
                    result.isValid = false;
                    result.errors.push(`${moduleConfig.name}: Ad network [${adNetworkConfig.name}] is missing an 'id' value in IBC to fulfil [${adNetworkDefinition.id}].`);
                }
            }
            
            // Add the definitions source if it exists.
            if (adNetworkDefinition.hasOwnProperty('source')) {
                adNetworkConfig.source = adNetworkDefinition.source;
            }
        }
        else {
            result.isValid = false;
            result.errors.push(`[${adNetworkConfig.name}] not found in module definition specified in IBC.`);
        }
    }

    return result;
}

async function validateModule(IBC, moduleConfig) {
    var result =
    {
        isValid: true,
        errors: []
    };

    await axiosGithub.get(`/repos/maplemedia/${moduleConfig.name}/contents/ivory_module_definition.json`,
        {
            params:
            {
                // Get specific git tag.
                ref: moduleConfig.version
            }
        })
        .then(function (response) {
            var moduleDefinition = JSON.parse(Buffer.from(response.data.content, response.data.encoding).toString());
            if (moduleDefinition.type === "ads") {
                var adsResult = validateAdsModule(IBC, moduleConfig, moduleDefinition);
                if (!adsResult.isValid) {
                    result.isValid = false;
                    result.errors = result.errors.concat(adsResult.errors);
                }
            }

            // Keep the library_name for later use when applying.
            var currentPlatformDefinition = moduleDefinition.platforms.find(element => element.name === IBC.platform);
            moduleConfig.library_name = currentPlatformDefinition.library_name;

            // Validate min core version.
            if ('min_core_version' in moduleDefinition) {
                const coreModule = IBC.modules.find(element => element.name === "ivorysdk_core");
                if (coreModule) {
                    var moduleSplitVersion = moduleDefinition.min_core_version.split('.');
                    var IBCCoreSplitVersion = coreModule.version.split('.');

                    for (var i = 0; i < moduleSplitVersion.length && i < IBCCoreSplitVersion.length; i++) {
                        if (IBCCoreSplitVersion[i] < moduleSplitVersion[i]) {
                            result.isValid = false;
                            result.errors.push(`${moduleDefinition.name} version [${moduleDefinition.version}] does not support specified ivorysdk_core version [${coreModule.version}]. Please make ivorysdk_core at least version [${moduleDefinition.min_core_version}]`);
                        }
                    }
                } else {
                    result.isValid = false;
                    result.errors.push(`Unable to verify min_core_version for module [${moduleDefinition.name}] because ivorysdk_core module cannot be found.`);
                }
            }
        })
        .catch(function (error) {
            // handle error
            result.isValid = false;
            result.errors.push(`Unable to download ivory_module_definition.json for module [${moduleConfig.name}]. Please check if module version tag [${moduleConfig.version}] exists.`);
            console.log(error);
        })
        .then(function () {

        });

    return result;
};

module.exports = { validateModule };
