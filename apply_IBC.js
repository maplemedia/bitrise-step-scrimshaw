const fs = require('fs');
const plist = require('plist');
const { exec } = require('child_process');
const { Console } = require('console');

// Default sources are required by any IBC.
var ivoryPodfileSources = [
    "https://github.com/maplemedia/IvorySDK-specs.git",
    "https://github.com/CocoaPods/Specs.git"
];

function applyIBCToPlist(IBC) {
    var result =
    {
        success: true,
        errors: []
    };

    var plistToApply = [];

    // Get ad network plist values.
    for (var moduleConfig of IBC.modules) {
        if (moduleConfig.hasOwnProperty('ad_networks')) {
            for (var adNetworkConfig of moduleConfig.ad_networks) {
                if (adNetworkConfig.hasOwnProperty('id')) {
                    if (adNetworkConfig.hasOwnProperty('id_key')) {
                        plistToApply.push(
                            {
                                "key": adNetworkConfig.id_key,
                                "value": adNetworkConfig.id
                            });
                    }
                    else {
                        result.success = false;
                        result.errors.push(`Missing id_key for ad config network ${moduleConfig.name}:${adNetworkConfig.name}`);
                    }
                }
            }
        }
    }

    if (result.success) {
        // Turn plist into json to apply values.
        const filePath = IBC.workspace + IBC.plist_path;
        var loadedPlist = plist.parse(fs.readFileSync(filePath, 'utf8'));
        for (var valueToApply of plistToApply) {
            loadedPlist[valueToApply.key] = valueToApply.value;
        }

        // Turn back into plist format for writing.
        var appliedPlist = plist.build(loadedPlist)
        fs.writeFileSync(filePath, appliedPlist);
    }

    return result;
}

function applyIBCToPodfile(IBC) {
    var result =
    {
        success: true,
        errors: []
    };

    // Turn Podfile into JSON for easier handling.
    const filePath = IBC.workspace + IBC.podfile_path;
    exec("pod ipc podfile-json " + filePath, (error, rawJsonPodfile, stderr) => {
        if (error || stderr) {
            result.success = false;
            result.errors.push(`Unable to convert [${filePath}] podfile to json using the command [pod ipc podfile-json]\nerror:${error}\nstderr:${stderr}.`);
            throw result;
        }
        console.log(`rawJsonPodfile: ${rawJsonPodfile}`);

        var jsonPodfile = JSON.parse(rawJsonPodfile);
        // NOTE: Using target_definitions[0] because that's where the Pods root target is located.
        if (jsonPodfile.hasOwnProperty('target_definitions') && jsonPodfile.target_definitions[0].hasOwnProperty('children')) {
            // Apply for every podfile target.
            for (var podfileTarget of IBC.podfile_targets) {
                // Find root for this target.
                var targetDefinition = jsonPodfile.target_definitions[0].children.find(element => element.name === podfileTarget);
                if (targetDefinition) {
                    // Apply dependency versions and sources of modules.
                    for (var moduleConfig of IBC.modules) {
                        // Find the podfile dependency for this module.
                        var foundDependency = null;
                        var subspecDependencies = [];
                        for (var i = 0; i < targetDefinition.dependencies.length; i++) {
                            var dependency = targetDefinition.dependencies[i];
                            Object.keys(dependency).forEach(function (k) {
                                // JSON dependencies are written like:[spec/subspec]
                                if (k.toLowerCase().startsWith(moduleConfig.name.toLowerCase())) {
                                    if (k.includes('/')) {
                                        // Subspecs append a '/' character. We remove them all and add new ones later ...
                                        subspecDependencies.push(k);
                                    } else {
                                        // Update spec dependency version.
                                        console.log(`${k}:Updating podfile version [${dependency[k]}]->[${moduleConfig.version}].`);
                                        dependency[k][0] = moduleConfig.version;
                                        foundDependency = dependency;
                                    }

                                }
                            })
                        }

                        // Remove subspec dependencies.
                        for (var subspec of subspecDependencies) {
                            for (var i = 0; i < targetDefinition.dependencies.length; i++) {
                                if (targetDefinition.dependencies[i].hasOwnProperty(subspec)) {
                                    console.log(`${moduleConfig.name}:removing subspec from old podfile:[${subspec}].`);
                                    targetDefinition.dependencies.splice(i, 1);
                                    break;
                                }
                            }
                        }

                        // Add dependency if it is missing.
                        if (!foundDependency) {
                            console.log(`Adding podfile dependency [${moduleConfig.name}:${moduleConfig.version}]`);
                            var newDependency = {};
                            newDependency[moduleConfig.name] = [moduleConfig.version];
                            targetDefinition.dependencies.push(newDependency);
                            foundDependency = targetDefinition.dependencies[targetDefinition.dependencies.length - 1];
                        }

                        // Ad network specific features.
                        if (moduleConfig.hasOwnProperty('ad_networks')) {
                            for (var adNetworkConfig of moduleConfig.ad_networks) {
                                // Add ad network subspecs.
                                var newDependency = {};
                                newDependency[`${moduleConfig.name}/${adNetworkConfig.name}`] = [moduleConfig.version];
                                targetDefinition.dependencies.push(newDependency);
                                console.log(`Adding subspec dependency [${Object.keys(newDependency)[0]}]`);

                                // New podfile sources.
                                if (adNetworkConfig.hasOwnProperty('source')) {
                                    if (!ivoryPodfileSources.includes(adNetworkConfig.source)) {
                                        ivoryPodfileSources.push(adNetworkConfig.source);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Apply sources.
        for (var ivorySource of ivoryPodfileSources) {
            if (!jsonPodfile.hasOwnProperty('sources')) {
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
        const outPath = IBC.workspace + "CocoaPods.podfile.yaml";
        console.log(`Writing [${outPath}].`);
        fs.writeFileSync(outPath, JSON.stringify(jsonPodfile));
    });

    return result;
}

function applyIBCToAndroidManifest(IBC) {

}

function applyIBCToAppGradle(IBC) {

}

function applyIBCToModuleGradle(IBC) {

}

module.exports = { applyIBCToPlist, applyIBCToPodfile };