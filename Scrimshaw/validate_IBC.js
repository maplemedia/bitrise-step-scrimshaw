
function validateAdsModule(IBC, moduleConfig) {
    const ibcLoader = require("./scrimshaw_ibc");

    var result =
    {
        isValid: true,
        errors: []
    };

    // Validate network exists and if the required ID is 
    for (var i = 0; i < moduleConfig.ad_networks.length; i++) {
        var adNetworkConfig = moduleConfig.ad_networks[i];
        const adNetworkDefinition = ibcLoader.getAdNetworkDefinition(moduleConfig.definition, IBC.platform, adNetworkConfig.name);

        if (adNetworkDefinition) {
            // Check if this network requires an ID and it is missing.
            if (adNetworkDefinition.hasOwnProperty('id') && !adNetworkConfig.hasOwnProperty('id')) {
                result.isValid = false;
                result.errors.push(`${moduleConfig.name}: Ad network [${adNetworkConfig.name}] is missing an 'id' value in IBC to fulfil [${adNetworkDefinition.id}].`);
            }
            
            // Add the definitions source if it exists.
            if (adNetworkDefinition.hasOwnProperty('source')) {
                adNetworkConfig.source = adNetworkDefinition.source;
            }
        } else {
            result.isValid = false;
            result.errors.push(`[${adNetworkConfig.name}] not found in module definition specified in IBC.`);
        }
    }

    return result;
}

async function validateModules(IBC) {
    var result =
    {
        isValid: true,
        errors: []
    };

    // Load dependencies from github and validate modules.
    for (var moduleConfig of IBC.modules) {
        if (moduleConfig.definition.type === "ads") {
            var adsResult = validateAdsModule(IBC, moduleConfig);
            if (!adsResult.isValid) {
                result.isValid = false;
                result.errors = result.errors.concat(adsResult.errors);
            }
        }

        // Validate module dependencies to other modules' min_version value.
        // Example: MoPub can't depend on older Core versions.
        if ('dependencies' in moduleConfig.definition) {
            for (var dependency of moduleConfig.definition.dependencies) {
                const dependencyModule = IBC.modules.find(element => element.name === dependency.name);
                if (dependencyModule) {
                    var moduleSplitVersion = dependency.min_version.split('.');
                    var dependencySplitVersion = dependencyModule.version.split('.');

                    for (var i = 0; i < moduleSplitVersion.length && i < dependencySplitVersion.length; i++) {
                        if (dependencySplitVersion[i] < moduleSplitVersion[i]) {
                            result.isValid = false;
                            result.errors.push(`[${moduleConfig.definition.name}:${moduleConfig.definition.version}] does not support specified [${dependencyModule.name}:${dependencyModule.version}] because the version is too low. Please make [${dependencyModule.name}] at least version [${dependency.min_version}]`);
                        }
                    }
                } else {
                    result.isValid = false;
                    result.errors.push(`Unable to verify dependency for module [${moduleConfig.definition.name}] because [${dependency.name}] module cannot be found in the IBC.`);
                }
            }
        }
    }

    return result;
};

module.exports = { validateModules };
