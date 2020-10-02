const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
    throw dotEnvResult.error
}

(async () => {
    try {
        if (process.env.hasOwnProperty('substep')) {
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
            }
        }
    }
    catch (e) {
        await slackStep.reportException(e);

        // Return error.
        process.exit(1);
    }
})();
