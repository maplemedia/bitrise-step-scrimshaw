const axios = require("axios");
const e = require("express");
const axiosSlack = axios.create({ baseURL: "https://slack.com/api/" });

async function postMessage(message) {
    const ibcLoader = require("./scrimshaw_ibc");
    IBC = ibcLoader.loadIBC();

    // Prevent message?
    if (process.env.hasOwnProperty('BLOCK_SLACK_REPORTS') && process.env.BLOCK_SLACK_REPORTS == true)
    {
        console.log(message);
        return;
    }

    await axiosSlack
        .post(`/chat.postMessage`,
        {
            channel: IBC.slack_channel,
            text: message
        },
        {
            headers: { authorization: `Bearer ${IBC.slack_token}` }
        })
        .then(function (response) {
            console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        })
        .then(function () {

        });
}

async function reportException(e){
    try{
        const ibcLoader = require("./scrimshaw_ibc");
        IBC = ibcLoader.loadIBC();
        var prettyErrors = `:boom:${process.env.BITRISE_APP_TITLE}:boom:\n
Scrimshaw has encountered an error while building:\n
exception:${e.message}\n\nBuild URL:${process.env.BITRISE_BUILD_URL}\n`;
        console.log(e);
    
        if (e.hasOwnProperty('errors')) {
            prettyErrors += "\nErrors:\n----------\n";
            console.log("Errors:")
            for (var i = 0; i < e.errors.length; i++) {
                prettyErrors += `${i}:${e.errors[i]}\n`;
                console.log(e.errors[i]);
            }
        }
        await postMessage(prettyErrors);
    } catch (slackException) {
        console.log(slackException);
    }
}

module.exports = { postMessage, reportException };