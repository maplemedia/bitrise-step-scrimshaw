const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}
const ssGithub = require("./scrimshaw_github");
const fs = require("fs");
const exec_cmd = require("./exec_cmd");

async function applyModuleDependencies() {
  if (!process.env.hasOwnProperty("IBC")){
    throw new Error("No IBC environment variable for applyModuleDependencies step.");
  }
  var IBC = JSON.parse(process.env.IBC);
  if (!IBC.hasOwnProperty("ivory_module_definition_path")) {
    throw new Error("Missing ivory_module_definition_path in IBC.");
  }

  // Get dependencies from module definition.
  console.log(`Loading ${IBC.ivory_module_definition_path} ...`);
  var moduleDefinitionPath = process.env.BITRISE_SOURCE_DIR + "/" + IBC.ivory_module_definition_path;
  var rawModuleDefinition = fs.readFileSync(moduleDefinitionPath);
  var moduleDefinition = JSON.parse(rawModuleDefinition);

  if (moduleDefinition.hasOwnProperty("dependencies")) {
    for (var moduleDependency of moduleDefinition.dependencies) {
      console.log(`Fetching ${moduleDependency.name} env key name from github ...`);
      const moduleDefinition = await ssGithub.fetchModuleDefinition(moduleDependency.name, moduleDependency.min_version, IBC.platform);

      // Automatically add optimistic operator on iOS.
      var envValue = moduleDependency.min_version;
      if (IBC.platform === "ios") {
        envValue = `~> ${envValue}`;
      }

      // Set bitrise_env value to min version using envman.
      if (process.env.hasOwnProperty("BITRISE_IO")) {
        console.log(`Applying --key ${moduleDefinition.bitrise_env} --value "${envValue}" to environment variables ...`);
        await exec_cmd.execShellCommand(`envman add --key ${moduleDefinition.bitrise_env} --value "${envValue}"`);
      } else {
        process.env[moduleDefinition.bitrise_env] = envValue;
        console.log(`min core version:${process.env[moduleDefinition.bitrise_env]}`);
      }
    }
  } else {
    console.log("Module definition has no dependencies. Continuing ...");
  }
}

module.exports = {
  applyModuleDependencies,
};
