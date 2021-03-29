const fs = require("fs");
const plist = require("plist");
const ibcLoader = require("./scrimshaw_ibc");

const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}

// Default sources are required by any IBC.
var ivoryPodfileSources = ["https://github.com/maplemedia/IvorySDK-specs.git", "https://github.com/CocoaPods/Specs.git"];

let IBC;

function applyIBCToPlist(IBC) {
  var result = {
    success: true,
    errors: [],
  };

  var plistToApply = [];

  // Get ad bidder plist values.
  for (var moduleConfig of IBC.modules) {
    if (moduleConfig.hasOwnProperty("ad_bidders")) {
      for (var adBidderConfig of moduleConfig.ad_bidders) {
        if (adBidderConfig.hasOwnProperty("id")) {
          // Get ad network id name from definition.
          const adBidderDefinition = ibcLoader.getAdBidderDefinition(moduleConfig.definition, adBidderConfig.name);

          if (adBidderDefinition.hasOwnProperty("id")) {
            plistToApply.push({
              key: adBidderDefinition.id,
              value: adBidderConfig.id,
            });
          } else {
            result.success = false;
            result.errors.push(`Missing 'adBidderDefinition.id' for ad config network ${moduleConfig.name}:${adBidderConfig.name}`);
          }
        }
      }
    }
  }

  // Get ad network plist values.
  for (var moduleConfig of IBC.modules) {
    if (moduleConfig.hasOwnProperty("ad_networks")) {
      for (var adNetworkConfig of moduleConfig.ad_networks) {
        if (adNetworkConfig.hasOwnProperty("id")) {
          // Get ad network id name from definition.
          const adNetworkDefinition = ibcLoader.getAdNetworkDefinition(moduleConfig.definition, adNetworkConfig.name);

          if (adNetworkDefinition.hasOwnProperty("id")) {
            plistToApply.push({
              key: adNetworkDefinition.id,
              value: adNetworkConfig.id,
            });
          } else {
            result.success = false;
            result.errors.push(`Missing 'adNetworkDefinition.id' for ad config network ${moduleConfig.name}:${adNetworkConfig.name}`);
          }
        }
      }
    }
  }

  if (result.success) {
    // Turn plist into json to apply values.
    const filePath = process.env.BITRISE_SOURCE_DIR + "/" + IBC.plist_path;
    var loadedPlist = plist.parse(fs.readFileSync(filePath, "utf8"));
    for (var valueToApply of plistToApply) {
      loadedPlist[valueToApply.key] = valueToApply.value;
    }

    // Turn back into plist format for writing.
    var appliedPlist = plist.build(loadedPlist);
    fs.writeFileSync(filePath, appliedPlist);
  }

  return result;
}

function recursiveReplace(obj, key, val) {
  Object.keys(obj).forEach(function (k) {
    if (k === key) {
      console.log(`Patching [${key}]:[${val}].`);
      obj[k] = val;
    } else if (typeof obj[k] == "object") {
      recursiveReplace(obj[k], key, val);
    }
  });
}

async function applyIBCToPodfile(IBC) {
  var result = {
    success: true,
    errors: [],
  };

  // Turn Podfile into JSON for easier handling.
  const filePath = process.env.BITRISE_SOURCE_DIR + "/" + IBC.podfile_path;
  const exec_cmd = require("./exec_cmd");
  var rawJsonPodfile = await exec_cmd.execShellCommand("pod ipc podfile-json " + filePath);

  console.log(`rawJsonPodfile: ${rawJsonPodfile}`);

  var jsonPodfile = JSON.parse(rawJsonPodfile);
  // NOTE: Using target_definitions[0] because that's where the Pods root target is located.
  if (jsonPodfile.hasOwnProperty("target_definitions") && jsonPodfile.target_definitions[0].hasOwnProperty("children")) {
    // Apply for every podfile target.
    for (var podfileTarget of IBC.podfile_targets) {
      // HACK: Turn the uses_frameworks hash into a boolean. cocoapods causes an error otherwise.
      recursiveReplace(jsonPodfile.target_definitions[0], "uses_frameworks", true);

      // Find root for this target.
      var targetDefinition = jsonPodfile.target_definitions[0].children.find((element) => element.name === podfileTarget);
      if (targetDefinition) {
        // Clear all dependencies starting with ivorysdk.
        var i = targetDefinition.dependencies.length;
        while (i--) {
          var keys = Object.keys(targetDefinition.dependencies[i]);
          if (keys && keys.length > 0 && keys[0].toLowerCase().startsWith("ivorysdk")) {
            console.log(`Removing IvorySDK reference from Podfile:[${keys[0]}].`);
            targetDefinition.dependencies.splice(i, 1);
          }
        }

        // TODO: Clear dependencies for pods that we need to remove because of modules.
        // example: Fyber_Marketplace_MoPubAdapter

        // Apply dependency versions and sources of modules.
        for (var moduleConfig of IBC.modules) {
          // Find the podfile dependency for this module.
          var foundDependency = null;
          var subspecDependencies = [];
          for (var i = 0; i < targetDefinition.dependencies.length; i++) {
            var dependency = targetDefinition.dependencies[i];
            Object.keys(dependency).forEach(function (k) {
              // JSON dependencies are written like:[spec/subspec]
              if (k.toLowerCase().startsWith(moduleConfig.definition.library_name.toLowerCase())) {
                if (k.includes("/")) {
                  // Subspecs append a '/' character. We remove them all and add new ones later ...
                  subspecDependencies.push(k);
                } else {
                  // Update spec dependency version.
                  console.log(`${k}:Updating podfile version [${moduleConfig.version}].`);
                  dependency[k][0] = moduleConfig.version;
                  foundDependency = dependency;
                }
              }
            });
          }

          // Remove subspec dependencies.
          for (var subspec of subspecDependencies) {
            for (var i = 0; i < targetDefinition.dependencies.length; i++) {
              if (targetDefinition.dependencies[i].hasOwnProperty(subspec)) {
                console.log(`${moduleConfig.definition.library_name}:removing subspec from old podfile:[${subspec}].`);
                targetDefinition.dependencies.splice(i, 1);
                break;
              }
            }
          }

          // Ad network specific features. Ad networks are special because we don't include the IvorySDK_{module}:version
          // specifically otherwise it includes all of its submodules. We rather only include the array of submodules so
          // we can have exact lists.
          if (moduleConfig.hasOwnProperty("ad_networks")) {
            // Ad bidder definitions.
            if (moduleConfig.hasOwnProperty("ad_bidders")) {
              for (var adBidderConfig of moduleConfig.ad_bidders) {
                // Add ad network subspecs.
                var newDependency = {};
                newDependency[`${platformModuleDefinition.library_name}/${adBidderConfig.name}`] = [moduleConfig.version];
                targetDefinition.dependencies.push(newDependency);
                console.log(`Adding subspec bidder dependency [${Object.keys(newDependency)[0]}]:${moduleConfig.version}`);

                // New podfile sources.
                if (adBidderConfig.hasOwnProperty("source")) {
                  if (!ivoryPodfileSources.includes(adBidderConfig.source)) {
                    ivoryPodfileSources.push(adBidderConfig.source);
                  }
                }
              }
            }

            // Ad network definitions.
            for (var adNetworkConfig of moduleConfig.ad_networks) {
              // Add ad network subspecs.
              var newDependency = {};
              newDependency[`${platformModuleDefinition.library_name}/${adNetworkConfig.name}`] = [moduleConfig.version];
              targetDefinition.dependencies.push(newDependency);
              console.log(`Adding subspec network dependency [${Object.keys(newDependency)[0]}]:${moduleConfig.version}`);

              // New podfile sources.
              if (adNetworkConfig.hasOwnProperty("source")) {
                if (!ivoryPodfileSources.includes(adNetworkConfig.source)) {
                  ivoryPodfileSources.push(adNetworkConfig.source);
                }
              }
            }
          } else if (!foundDependency) {
            // Add dependency if it is missing.
            console.log(`Adding podfile dependency [${platformModuleDefinition.library_name}:${moduleConfig.version}]`);
            var newDependency = {};
            newDependency[platformModuleDefinition.library_name] = [moduleConfig.version];
            targetDefinition.dependencies.push(newDependency);
          }
        }
      }
    }
  }

  // Apply sources.
  for (var ivorySource of ivoryPodfileSources) {
    if (!jsonPodfile.hasOwnProperty("sources")) {
      jsonPodfile.sources = [];
    }

    if (!jsonPodfile.sources.includes(ivorySource)) {
      console.log(`Adding podfile source:[${ivorySource}].`);
      jsonPodfile.sources.push(ivorySource);
    }
  }

  // Writting down JSON as YAML since YAML is supported by CocoaPods and it supports embedded JSON format.
  // NOTE: Write to 'CocoaPods.podfile.yaml' since it has priority over 'Podfile'.
  // See: https://github.com/CocoaPods/CocoaPods/blob/master/lib/cocoapods/config.rb#L296
  const outPath = filePath.substring(0, filePath.lastIndexOf("/")) + "/CocoaPods.podfile.yaml";
  console.log(`Writing [${outPath}].`);
  fs.writeFileSync(outPath, JSON.stringify(jsonPodfile));

  return result;
}

async function applyIBC() {
  const ibcLoader = require("./scrimshaw_ibc");
  IBC = ibcLoader.loadIBC();

  // Apply requires module definitions from github for ad network key names, subspec names and library_name.
  await ibcLoader.attachDefinitions(IBC);

  switch (IBC.platform) {
    case "android":
      applyAndroidIBC();
      break;
    case "ios":
      await applyiOSIBC();
      break;
  }
  console.log("IBC is applied!");
}

async function applyiOSIBC() {
  const applyPlistResult = applyIBCToPlist(IBC);
  if (!applyPlistResult.success) {
    throw applyPlistResult;
  }

  const applyPodfileResult = await applyIBCToPodfile(IBC);
  if (!applyPodfileResult.success) {
    throw applyPodfileResult;
  }
}

module.exports = { applyIBC };
