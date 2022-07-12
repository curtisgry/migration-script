// const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const colors = require("colors");

const simpleGit = require("simple-git");
simpleGit().clean(simpleGit.CleanOptions.FORCE);

const { Octokit, App } = require("octokit");
// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

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
  //Pulling out just the slug and clone url from the api response array
  data.values.forEach((val) => {
    const repoInfo = {
      slug: val.slug,
      clone: val.links.clone[0].href,
    };
    //currently pushing into global const repoDataList
    repoDataList.push(repoInfo);
  });
};

// Clone repo from bitbucket
const cloneRepo = async (repoLink) => {
  console.log(`Cloning`, `${repoLink} ...`.green);
  await simpleGit().mirror(repoLink);
};

const createGitHubRepo = async (repoName) => {
  console.log(`Creating GitHub repository...`.green);
  try {
    // will return data containing remote url probably better to use later
    const test = await octokit.request(`POST /user/repos`, {
      name: repoName,
    });
  } catch (error) {
    console.log(`${error}`.red);
  }
};

async function pushToGithub(gitName, remoteUrl) {
    // workingDir to set path for simpleGit
  const workingDir = __dirname + `/${gitName}.git`;
  try {
    console.log(`Removing remote origin...`.bgGreen);
    //.removeRemote by  (name)
    await simpleGit(workingDir).removeRemote("origin");
    console.log(`Setting remote origin to ${remoteUrl}`.bgGreen);
    // .addremote takes (name, remote)
    await simpleGit(workingDir).addRemote("origin", remoteUrl);
    console.log(`Pushing repo to GitHub...`.rainbow);
    // simpleGit accepts flags as a second argument as an array of strings
    await simpleGit(workingDir).push("origin", ["--mirror"]);
  } catch (error) {
    console.log(error);
  }
}

(async () => {
  // Authenticate octokit
  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated();
  console.log("Hello, %s", login);

  //for testing

  //get repo data into array
  await makeRepoDataList();
  // console.log(repoDataList)
  const { clone, slug } = repoDataList[1];
  // create github remote repo
  await createGitHubRepo(slug);
  const remoteUrl = `https://github.com/curtisgry/${slug}`;
  // clone repo from bitbucket
  await cloneRepo(clone);
  //for deleting folder later
  const repoPath = __dirname + `/${slug}.git`;
  //repo name and remote url
  await pushToGithub(slug, remoteUrl);

  // Cleanup! delete directory
  await fs.rmdir(repoPath, { recursive: true }, (err) => {
    if (err) {
      throw err;
    }
    console.log(`Removing ${slug} directory...`);
  });

  console.log(`Finished! Here is the new GitHub repo: ${remoteUrl}`.green);
})();
