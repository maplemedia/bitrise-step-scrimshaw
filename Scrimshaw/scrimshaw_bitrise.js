const axios = require("axios");
const axiosBitrise = axios.create({ baseURL: "https://api.bitrise.io/v0.1" });
axiosBitrise.defaults.headers.common["Authorization"] = process.env.BITRISE_TOKEN;

async function listApps() {
    var apps = [];
    
    const args = {
      sort_by:"last_build_at"
    };
    
    await axiosBitrise
      .get(`/apps`, args)
      .then(function(response) {
            // handle success
          apps = response.data.data;
      })
      .catch(function(error) {
        console.log("Error:" + error.message);
      console.log(error);
      })
      .then(function() {
        // always executed
      });
    
    return apps;
  }

module.exports = { listApps };