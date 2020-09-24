const dotEnvResult = require('dotenv').config()
if (dotEnvResult.error) {
  throw dotEnvResult.error
}

const apply_IBC = require("./apply_IBC");
let IBC;

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
  console.log('IBC is applied!');
}

function applyAndroidIBC() {

}

async function applyiOSIBC() {
  const applyPlistResult = apply_IBC.applyIBCToPlist(IBC);
  if (!applyPlistResult.success) {
    throw applyPlistResult;
  }

  const applyPodfileResult = await apply_IBC.applyIBCToPodfile(IBC);
  if (!applyPodfileResult.success) {
    throw applyPodfileResult;
  }
}

/*(async () => {
  try {
    await applyIBC();
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

module.exports = { applyIBC };