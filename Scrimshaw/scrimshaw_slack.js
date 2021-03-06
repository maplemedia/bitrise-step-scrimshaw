const axios = require("axios");
const e = require("express");
const axiosSlack = axios.create({ baseURL: "https://slack.com/api/" });
const dotEnvResult = require("dotenv").config();
if (dotEnvResult.error) {
  throw dotEnvResult.error;
}

async function postMessage(message) {
  const ibcLoader = require("./scrimshaw_ibc");
  IBC = ibcLoader.loadIBC();

  // Prevent message?
  if (process.env.hasOwnProperty("BLOCK_SLACK_REPORTS") && process.env.BLOCK_SLACK_REPORTS == true) {
    console.log(message);
    return;
  }

  await axiosSlack
    .post(
      `/chat.postMessage`,
      {
        channel: IBC.slack_channel,
        text: message,
      },
      {
        headers: { authorization: `Bearer ${JSON.parse(process.env.IBS).slack_token}` },
      }
    )
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {});
}

async function reportException(e) {
  try {
    const ibcLoader = require("./scrimshaw_ibc");
    IBC = ibcLoader.loadIBC();
    var prettyErrors = `:boom:${process.env.BITRISE_APP_TITLE}:boom:\n
      Scrimshaw has encountered an error while building:\n
      exception:${e.message}\n\nBuild URL:${process.env.BITRISE_BUILD_URL}\n`;

    if (e.hasOwnProperty("errors")) {
      prettyErrors += "\nErrors:\n----------\n";
      for (var i = 0; i < e.errors.length; i++) {
        prettyErrors += `${i}:${e.errors[i]}\n`;
      }
    }
    await postMessage(prettyErrors);
  } catch (slackException) {
    console.log(slackException);
  }
}

module.exports = { postMessage, reportException };
