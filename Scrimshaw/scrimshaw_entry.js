const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}

(async () => {
  try {
    if (process.env.hasOwnProperty("substep")) {
      console.log(`Starting substep:${process.env.substep}`);
      switch (process.env.substep) {
        case "validate":
          const validateStep = require("./scrimshaw_validate");
          await validateStep.validateIBC();
          break;
        case "apply":
          const applyStep = require("./scrimshaw_apply");
          await applyStep.applyIBC();
          break;
        case "commit":
          const commitStep = require("./scrimshaw_commit");
          await commitStep.commitChanges();
          break;
        case "push":
          const pushStep = require("./scrimshaw_push");
          await pushStep.pushAndCreatePR();
          break;
        case "bitrise":
          const bitriseStep = require("./scrimshaw_bitrise");
          await bitriseStep.listApps();
          break;
        case "slack":
          const slackStep = require("./scrimshaw_slack");
          await slackStep.postMessage("testing");
          break;
        case "scrimshaw":
          const scrimshawStep = require("./scrimshaw_bitrise");
          await scrimshawStep.startWorkflow("Scrimshaw");
          break;
        case "applyModuleDependencies":
          const ivoryStep = require("./scrimshaw_ivory");
          await ivoryStep.applyModuleDependencies();
          break;
        case "skan":
          const skanStep = require("./scrimshaw_skadnetwork");
          await skanStep.cleanSKAN();
          break;
      }
    }
  } catch (e) {
    console.log(e);
    if (e.hasOwnProperty("errors")) {
      console.log("Errors:");
      for (var i = 0; i < e.errors.length; i++) {
        console.log(e.errors[i]);
      }
    }
    const slackStep = require("./scrimshaw_slack");
    await slackStep.reportException(e);

    // Return error.
    process.exit(1);
  }
})();
