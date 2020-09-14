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

async function applyIBCToPList() {

}

async function main() {
  const fs = require('fs');

  // Check if IBC is in the environment variables (CI)
  if ('IBC' in process.env) {
    var rawBuildConfig = process.env.IBC;
    IBC = JSON.parse(rawBuildConfig);
    IBC.workspace = process.env.BITRISE_SOURCE_DIR;
  } else {
    var workspace = 'D:/git/IvorySDK_Sample/Samples/iOS/';
    if (process.argv.length > 2) {
      workspace = process.argv[2];
      console.log(`Using workspace:${workspace}`);
    }
  
    var rawBuildConfig = fs.readFileSync(workspace + 'ivory_build_config.json');
    IBC = JSON.parse(rawBuildConfig);
    IBC.workspace = workspace;
  }


  var result =
  {
    success: true
  };

  await validateIBC();
  await applyIBC();

  return result;
}

(async () => {
  try {
    var result = await main();
    console.log(result);
  }
  catch (e) {
    console.log(e);

    if (e.hasOwnProperty('errors')) {
      console.log("Errors:")
      for (var i = 0; i < e.errors.length; i++) {
        console.log(e.errors[i]);
      }
    }
    // Deal with the fact the chain failed
  }
})();