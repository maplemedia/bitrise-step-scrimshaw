const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}

function validateAdsModule(IBC, moduleConfig) {
  const ibcLoader = require("./scrimshaw_ibc");

  var result = {
    isValid: true,
    errors: [],
  };

  // Validate ad bidders exist and if their required IDs are present.
  if (moduleConfig.hasOwnProperty("ad_bidders")) {
    for (var i = 0; i < moduleConfig.ad_bidders.length; i++) {
      var adBidderConfig = moduleConfig.ad_bidders[i];
      const adBidderDefinition = ibcLoader.getAdBidderDefinition(moduleConfig.definition, IBC.platform, adBidderConfig.name);

      if (adBidderDefinition) {
        // Check if this bidder requires an ID and it is missing.
        if (adBidderDefinition.hasOwnProperty("id") && !adBidderConfig.hasOwnProperty("id")) {
          result.isValid = false;
          result.errors.push(`${moduleConfig.name}: Ad network [${adBidderConfig.name}] is missing an 'id' value in IBC to fulfil [${adBidderDefinition.id}].`);
        }
      } else {
        result.isValid = false;
        result.errors.push(`[${adBidderConfig.name}] not found in module definition specified in IBC.`);
      }
    }
  }

  // Validate networks exist and if their required IDs are present.
  for (var i = 0; i < moduleConfig.ad_networks.length; i++) {
    var adNetworkConfig = moduleConfig.ad_networks[i];
    const adNetworkDefinition = ibcLoader.getAdNetworkDefinition(moduleConfig.definition, IBC.platform, adNetworkConfig.name);

    if (adNetworkDefinition) {
      // Check if this network requires an ID and it is missing.
      if (adNetworkDefinition.hasOwnProperty("id") && !adNetworkConfig.hasOwnProperty("id")) {
        result.isValid = false;
        result.errors.push(`${moduleConfig.name}: Ad network [${adNetworkConfig.name}] is missing an 'id' value in IBC to fulfil [${adNetworkDefinition.id}].`);
      }
    } else {
      result.isValid = false;
      result.errors.push(`[${adNetworkConfig.name}] not found in module definition specified in IBC.`);
    }
  }

  return result;
}

async function validateModules(IBC) {
  var result = {
    isValid: true,
    errors: [],
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
    if ("dependencies" in moduleConfig.definition) {
      for (var dependency of moduleConfig.definition.dependencies) {
        const dependencyModule = IBC.modules.find((element) => element.name === dependency.name);
        if (dependencyModule) {
          var moduleSplitVersion = dependency.min_version.split(".");
          var dependencySplitVersion = dependencyModule.version.split(".");

          for (var i = 0; i < moduleSplitVersion.length && i < dependencySplitVersion.length; i++) {
            if (dependencySplitVersion[i] < moduleSplitVersion[i]) {
              result.isValid = false;
              result.errors.push(
                `[${moduleConfig.definition.name}:${moduleConfig.definition.version}] does not support specified [${dependencyModule.name}:${dependencyModule.version}] because the version is too low. Please make [${dependencyModule.name}] at least version [${dependency.min_version}]`
              );
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
}

async function validateIBC() {
  const ibcLoader = require("./scrimshaw_ibc");
  var IBC = ibcLoader.loadIBC();

  // Validation requires module definitions from github.
  await ibcLoader.attachDefinitions(IBC);

  // Load dependencies from github and validate modules.
  const result = await validateModules(IBC);
  if (!result.isValid) {
    throw result;
  }

  console.log("IBC is valid!");
  return result;
}

module.exports = { validateIBC };
