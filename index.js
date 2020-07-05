const core = require("@actions/core");
const axios = require("axios");

const waitForUrl = async (url, MAX_TIMEOUT) => {
  const iterations = MAX_TIMEOUT / 3;
  for (let i = 0; i < iterations; i++) {
    try {
      await axios.get(url);
      return;
    } catch (e) {
      console.log("Url unavailable, retrying...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  core.setFailed(`Timeout reached: Unable to connect to ${url}`);
};

const run = async () => {
  try {
    const commit = process.env.GITHUB_SHA;
    const MAX_TIMEOUT = Number(core.getInput("max_timeout")) || 60;
    const siteName = core.getInput("site_name");
    if (!commit) {
      core.setFailed("Could not determine GitHub commit");
    }
    if (!siteName) {
      core.setFailed("Required field `site_name` was not provided");
    }
    const url = `https://${commit}--${siteName}.netlify.app`;
    core.setOutput("url", url);
    console.log(`Waiting for a 200 from: ${url}`);
    await waitForUrl(url, MAX_TIMEOUT);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
