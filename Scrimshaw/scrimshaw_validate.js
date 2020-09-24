const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
    throw dotEnvResult.error
}

const validate_IBC = require("./validate_IBC");

async function validateIBC() {
    const ibcLoader = require("./scrimshaw_ibc");
    var IBC = ibcLoader.loadIBC();

    // Validation requires module definitions from github.
    await ibcLoader.attachDefinitions(IBC);

    // Load dependencies from github and validate modules.
    const result = await validate_IBC.validateModules(IBC);
    if (!result.isValid) {
        throw result;
    }

    return result;
}

/*(async () => {
    try {
        await validateIBC();
        console.log('IBC is valid!');
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
})();*/

module.exports = { validateIBC };