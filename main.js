const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
  throw dotEnvResult.error
}

const validate_IBC = require("./validate_IBC");
const apply_IBC = require("./apply_IBC");
const axios = require("axios");

let IBC;

async function validateIBC() {
  var result =
  {
    isValid: true,
    errors: []
  };

  // Load dependencies from github and validate modules.
  for (var moduleConfig of IBC.modules) {
    const validateResult = await validate_IBC.validateModule(IBC, moduleConfig);
    if (!validateResult.isValid) {
      result.isValid = false;
      result.errors = result.errors.concat(validateResult.errors);
    }
  }

  if (!result.isValid) {
    throw result;
  }

  return result;
}

async function applyIBC() {
  switch (IBC.platform) {
    case "android":
      applyAndroidIBC();
      break;
    case "ios":
      applyiOSIBC();
      break;
  }
}

function applyAndroidIBC() {

}

function applyiOSIBC() {
  const applyPlistResult = apply_IBC.applyIBCToPlist(IBC);
  if (!applyPlistResult.success) {
    throw applyPlistResult;
  }

  const applyPodfileResult = apply_IBC.applyIBCToPodfile(IBC);
  if (!applyPodfileResult.success) {
    throw applyPodfileResult;
  }
}

async function main() {
  const fs = require('fs');

  if ('IBC' in process.env) {
    // IBC is in the environment variables (CI)
    IBC = JSON.parse(process.env.IBC);

    // When working with CI, write the IBC to the workspace so it's versionned.
    const outPath = process.env.BITRISE_SOURCE_DIR + "/ivory_build_config.json";
    console.log(`Writing [${outPath}].`);
    fs.writeFileSync(outPath, process.env.IBC);

    // Keep CI workspace path for plist/podspec/etc ...
    IBC.workspace = process.env.BITRISE_SOURCE_DIR;

  } else if ('IBC_PATH' in process.env) {
    // IBC is locally with a path
    var rawBuildConfig = fs.readFileSync(process.env.IBC_PATH + 'ivory_build_config.json');
    IBC = JSON.parse(rawBuildConfig);
    IBC.workspace = process.env.IBC_PATH;
  } else if (process.argv.length > 2) {
    // IBC path is a parameter to the node process
    var IBCPath = process.argv[2];
  
    var rawBuildConfig = fs.readFileSync(IBCPath + 'ivory_build_config.json');
    IBC = JSON.parse(rawBuildConfig);
    IBC.workspace = IBCPath;
  }

  await validateIBC();
  await applyIBC();
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
