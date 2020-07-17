const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

function getNetlifyUrl(url) {
  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
    },
  });
}

const waitForUrl = async (url, MAX_TIMEOUT) => {
  const iterations = MAX_TIMEOUT / 3;
  for (let i = 0; i < iterations; i++) {
    try {
      await axios.get(url);
      return;
    } catch (e) {
      console.log('Url unavailable, retrying...');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  core.setFailed(`Timeout reached: Unable to connect to ${url}`);
};

const run = async () => {
  try {
    const netlifyToken = process.env.NETLIFY_TOKEN;
    const commitSha = github.context.sha;
    const MAX_TIMEOUT = Number(core.getInput('max_timeout')) || 300;
    const siteId = core.getInput('site_id');
    if (!netlifyToken) {
      core.setFailed('Please set NETLIFY_TOKEN env variable to your Netlify Personal Access Token secret');
    }
    if (!commitSha) {
      core.setFailed('Could not determine GitHub commit');
    }
    if (!siteId) {
      core.setFailed('Required field `site_id` was not provided');
    }

    const { data: netlifyDeployments } = await getNetlifyUrl(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`);

    if (!netlifyDeployments) {
      core.setFailed(`Failed to get deployments for site`);
    }

    // Most likely, it's the first entry in the response
    // but we correlate it just to be safe
    const commitDeployment = netlifyDeployments.find((d) => d.commit_ref === commitSha);

    if (!commitDeployment) {
      core.setFailed(`Could not find deployment for commit ${commitSha}`);
    }

    core.setOutput('deploy_id', commitDeployment.id);

    // At this point, we have enough info to where
    // we could wait for the deployment state === "ready"
    // but it's probably more reliable to wait for the URL
    // to be available.
    //
    // This could be enhanced to wait for the deployment status
    // and then wait once again for the URL to return 200.
    const url = `https://${commitDeployment.id}--${commitDeployment.name}.netlify.app`;
    core.setOutput('url', url);
    console.log(`Waiting for a 200 from: ${url}`);
    await waitForUrl(url, MAX_TIMEOUT);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
