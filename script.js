// const fs = require("fs");
// const prompt = require("prompt-sync")({ sigint: true });
require("dotenv").config();
const axios = require("axios");

const { execSync } = require("child_process");
const colors = require("colors");

const simpleGit = require("simple-git");
simpleGit().clean(simpleGit.CleanOptions.FORCE);

const { Octokit, App } = require("octokit");
// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

const options = {
  baseDir: process.cwd(),
  binary: "git",
  maxConcurrentProcesses: 6,
};

// when setting all options in a single object
const git = simpleGit(options);

// console.log('First, some info about your accounts...')
// const workspace = prompt('Enter the name of your Bitbucket workspace: ')
// const username = prompt('Enter your Bitbucket username: ')
// const password = prompt('Enter your app password: ')

// Variables for testing
const workspace = process.env.USERNAME;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const ghUsername = process.env.GH_USERNAME;

// Will be populated with all address links
const repoDataList = [];

// Returns all data for repos from the api
const getAllRepoData = async () => {
  const res = await axios.get(
    `https://api.bitbucket.org/2.0/repositories/${workspace}`,
    {
      auth: {
        username,
        password,
      },
    }
  );
  return res.data;
};

//Populate repoDataList with slug and clone url
const makeRepoDataList = async () => {
  const data = await getAllRepoData();
  data.values.forEach((val) => {
    const repoInfo = {
      slug: val.slug,
      clone: val.links.clone[0].href,
    };
    repoDataList.push(repoInfo);
  });
};

async function basicShellCommand(command) {
  // run the `ls` command using exec
  await execSync(command, (err, output) => {
    // once the command has completed, the callback function is called
    if (err) {
      // log and return if we encounter an error
      console.error("could not execute command: ", err);
      return;
    }
    // log the output received from the command
    console.log("Output: \n", output);
  });
}

const cloneRepo = async (repoLink) => {
  console.log(`Cloning`, `${repoLink} ...`.green);
  await git.mirror(repoLink);
};

const createGitHubRepo = async (repoName) => {
  console.log(`Creating GitHub repository...`.green);
  try {
    const test = await octokit.request(`POST /user/repos`, {
        name: repoName
    });
  console.log(test);
  } catch (error) {
    console.log(`${error}`.red)
  }

};

(async () => {
  // Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated();
  console.log("Hello, %s", login);
  await makeRepoDataList();
  // console.log(repoDataList)
  // await cloneRepo(repoDataList[0].clone)
  await createGitHubRepo("test");
})();
