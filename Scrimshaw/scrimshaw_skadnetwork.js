const plist = require("plist");
const fs = require("fs");
const { stderr } = require("process");

// ROOT FILE REQUIREMENTS:
//
// SKAdNetworks.json
//  A JSON object containing all of the names of SKAN Ids
//  ex: {"SKAdNetworkItems":[{"name":"X","key":"SKAdNetworkIdentifier", "id": "xxx.skadnetwork"}]}
//
// SKAdNetworks.plist
//  A plist containing as many SKAN IDs to be cleaned up and only unique ids are kept. 
//
// OUTPUTS:
//  A new plist file with only unique IDs.
//  Written to CleanSKAdNetworks.plist
//  Then, the network names from the SKAdNetworks.json file are patched as XML comments. 
//  Written to PatchedSKAdNetworks.plist
//
// IMPROVEMENTS:
//  Could download SKAdNetworks.json + SKAdNetworks.plist form a maintained list and validate applications at build-time.

async function cleanSKAN()
{
    const filePath = "SKAdNetworks.plist";
    var loadedPlist = plist.parse(fs.readFileSync(filePath, "utf8"));
    var cleanPlist = {SKAdNetworkItems:[]};

    // Only keep unique SKAdNetworkIdentifiers
    for (var SKAdNetworkItem of loadedPlist.SKAdNetworkItems)
    {
        var found = false;
        for (var cleanSKAdNetworkItem of cleanPlist.SKAdNetworkItems)
        {
            if (cleanSKAdNetworkItem.SKAdNetworkIdentifier === SKAdNetworkItem.SKAdNetworkIdentifier)
            {
                found = true;
                break;
            }
        }
        if (!found)
        {
            cleanPlist.SKAdNetworkItems.push(SKAdNetworkItem);
        }
    }

    var appliedPlist = plist.build(cleanPlist);
    fs.writeFileSync("CleanSKAdNetworks.plist", appliedPlist);

    patchCleanSKAN(appliedPlist);
}

async function patchCleanSKAN(appliedPlist)
{
    const filePath = "SKAdNetworks.json";
    var SKAdNetworksJSON = JSON.parse(fs.readFileSync(filePath, "utf8"));
    var lines = appliedPlist.split("\n");

    for(var i = 0; i < lines.length; ++i)
    {
        var str = lines[i];
        if(str.indexOf("<string>") != -1)
        {
            var requiredString = str.substring(str.indexOf("<string>") + "<string>".length, str.indexOf("</string>"));
            if (requiredString.length > 0)
            {
                var source = "Unknown"
                for (var adNetworkJSON of SKAdNetworksJSON.SKAdNetworkItems)
                {
                    if (adNetworkJSON.id === requiredString)
                    {
                        source = adNetworkJSON.name;
                        break;
                    }
                }

                // Add Network name found in SKAdNetworks.json
                lines.splice(i - 1, 0, `        <!-- ${source} -->`);
                i++;
            }
        }
    }

    fs.writeFileSync("PatchedSKAdNetworks.plist", lines.join("\r\n"));
}

module.exports = { cleanSKAN };