const ibcLoader = require("./scrimshaw_ibc");
const axios = require("axios");
const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}

async function listApps() {
  var apps = [];

  const args = {
    sort_by: "last_build_at",
  };

  const IBC = ibcLoader.loadIBC();
  const axiosBitrise = axios.create({ baseURL: "https://api.bitrise.io/v0.1" });
  axiosBitrise.defaults.headers.common["Authorization"] = JSON.parse(process.env.IBS).bitrise_token;
  await axiosBitrise
    .get(`/apps`, args)
    .then(function (response) {
      // handle success
      apps = response.data.data;

      for (app of apps) {
        console.log("app:" + app);
      }
    })
    .catch(function (error) {
      console.log("Error:" + error.message);
      console.log(error);
    })
    .then(function () {
      // always executed
    });

  return apps;
}

async function startWorkflow(workflow) {
  const args = {
    build_params: {
      workflow_id: workflow,
    },
    hook_info: {
      type: "bitrise",
    },
  };

  var result;
  const IBC = ibcLoader.loadIBC();
  const axiosBitrise = axios.create({ baseURL: "https://api.bitrise.io/v0.1" });
  axiosBitrise.defaults.headers.common["Authorization"] = JSON.parse(process.env.IBS).bitrise_token;
  await axiosBitrise
    .post(`/apps/${process.env.BITRISE_APP_SLUG}/builds`, args)
    .then(function ({ data }) {
      console.log("Success:" + JSON.stringify(data));
      result = data;
    })
    .catch(function (error) {
      console.log("Error:" + error.message);
      throw error;
    });

  return result;
}

async function startBuildWithTag(tag) {
  const IBC = ibcLoader.loadIBC();
  const args = {
    build_params: {
      tag: tag,
      workflow_id: IBC.bitrise_publish_workflow,
      environments: [
        /*
          {"mapped_to":"SS_BUILD_NAME","value":buildParams.version_name},
          {"mapped_to":"SS_BUILD_TYPE","value":buildParams.build_type},
          {"mapped_to":"SS_BUILD_PLATFORM","value":appInfo.project_type}
        */
      ],
    },
    hook_info: {
      type: "bitrise",
    },
  };

  var result;
  const axiosBitrise = axios.create({ baseURL: "https://api.bitrise.io/v0.1" });
  axiosBitrise.defaults.headers.common["Authorization"] = JSON.parse(process.env.IBS).bitrise_token;
  await axiosBitrise
    .post(`/apps/${process.env.BITRISE_APP_SLUG}/builds`, args)
    .then(function ({ data }) {
      console.log("Success:" + JSON.stringify(data));
      result = data;
    })
    .catch(function (error) {
      console.log("Error:" + error.message);
      throw error;
    });

  return result;
}

module.exports = { listApps, startBuildWithTag, startWorkflow };
