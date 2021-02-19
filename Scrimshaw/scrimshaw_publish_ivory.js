const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}
const ssGithub = require("./scrimshaw_github");
const fs = require("fs");
const exec_cmd = require("./exec_cmd");

async function applyModuleDependencies() {
  // Get dependencies from module definition.
  console.log("Loading ivory_module_definition.json ...");
  var moduleDefinitionPath = process.env.BITRISE_SOURCE_DIR + "/ivory_module_definition.json";
  var rawModuleDefinition = fs.readFileSync(moduleDefinitionPath);
  var moduleDefinition = JSON.parse(rawModuleDefinition);

  if (moduleDefinition.hasOwnProperty("dependencies")) {
    for (var moduleDependency of moduleDefinition.dependencies) {
      console.log(`Fetching ${moduleDependency.name} env key name from github ...`);
      const moduleDefinition = await ssGithub.fetchModuleDefinition(moduleDependency.name, moduleDependency.min_version);

      // Automatically add optimistic operator on iOS.
      var envValue = moduleDependency.min_version;
      if (process.env.hasOwnProperty("IBC")) {
        if (JSON.parse(process.env.IBC).platform === "ios") {
          envValue = `~> ${envValue}`;
        }
      } else {
        throw new Error("No IBC environment variable for publishIvory step. Cannot get platform.");
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
