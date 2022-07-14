const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const colors = require("colors");
const validate = require("./lib/inputValidation");
const {extractDataToArray, getRepoData} = require('./lib/helpers')

const simpleGit = require("simple-git");
simpleGit().clean(simpleGit.CleanOptions.FORCE);

const { Octokit } = require("octokit");
// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

// console.log('First, some info about your accounts...')
// const workspace = prompt('Enter the name of your Bitbucket workspace: ')
// const username = prompt('Enter your Bitbucket username: ')
// const password = prompt('Enter your app password: ')

//delay for testing
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Variables for testing
const workspace = process.env.WORKSPACE;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const ghUsername = process.env.GH_USERNAME;

// Will be populated with all address links
let repoDataList = [];

// Returns all data for repos from the api
const getAllRepoData = async ({username, password, workspace}) => {
  try {
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
  } catch (error) {
    console.log(error);
    return null;
  }
};
// Date format YYYY-MM-dd
// Operators = != > >= < <=
const getReposByDate = async ({username, password, workspace, operator, date }) => {
  try {
    const res = await axios.get(
      `https://api.bitbucket.org/2.0/repositories/${workspace}?q=updated_on${operator}${date}`,
      {
        auth: {
          username,
          password,
        },
      }
    );
    return res.data;
  } catch (error) {
    console.log(`Status: ${error.response.status}`.yellow);
    console.log(`${error.response.statusText}`.red);
    return null;
  }
};



//Populate repoDataList with slug and clone url
const makeRepoDataList = async (filter, filterOptions) => {
  const {operator, date} = filterOptions;
  let data;
  if (filter && filterOptions) {
    data = await getRepoData({username, password, workspace, operator, date});
  } else {
    data = await getRepoData({username, password, workspace});
  }
  extractDataToArray(data, repoDataList);
};

// Clone repo from bitbucket
const cloneRepo = async (repoLink) => {
  console.log(`Cloning`, `${repoLink} ...`.green);
  await simpleGit(__dirname + '/repos').mirror(repoLink);
};

const cloneRepoList = async (arr) => {
  if (!arr.length) {
    console.log("Error repo list empty!".red);
    return;
  }
  for (const i in arr) {
    const { clone, slug } = arr[i];
    await cloneRepo(clone);
    await createGitHubRepo(slug);
    await pushToGithub(slug, clone);
  }
};

const createGitHubRepo = async (repoName) => {
  console.log(`Creating GitHub repository...`.green);
  try {
    // will return data containing remote url probably better to use later
    // const test = await octokit.request(`POST /user/repos`, {
    //   name: repoName,
    // });

    console.log("Make gh repo".cyan);
    await delay(2000);
  } catch (error) {
    console.log(`${error}`.red);
  }
};

async function pushToGithub(gitName, remoteUrl) {
  // workingDir to set path for simpleGit
  const workingDir = __dirname + `/repos/${gitName}.git`;
  try {
    console.log(`Removing remote origin...`.bgGreen);
    //.removeRemote by  (name)
    await simpleGit(workingDir).removeRemote("origin");
    console.log(`Setting remote origin to ${remoteUrl}`.bgGreen);
    // .addremote takes (name, remote)
    // await simpleGit(workingDir).addRemote("origin", remoteUrl);

    console.log("Add remote".cyan);
    await delay(2000);
    console.log(`Pushing repo to GitHub...`.rainbow);
    // simpleGit accepts flags as a second argument as an array of strings
    // await simpleGit(workingDir).push("origin", ["--mirror"]);
    await delay(2000);
    console.log("Push to Github".cyan);
    await delay(2000);
    console.log(`Deleting ${workingDir}`.red)
      // Cleanup! delete directory
    fs.rmdir(workingDir, { recursive: true }, (err) => {
      if (err) {
        throw err;
      }
    });
    await delay(1000);
  } catch (error) {
    console.log(error);
  }
}

const operatorInput = (operatorVar) => {
  const operator = prompt("Enter an operator[ = , != , >  , >=  , <= ] : ");

  if (!validate.operator(operator)) {
    console.log("Invalid operator".red);
    return operatorInput(operatorVar);
  }
  operatorVar.operator = operator;
};

const dateInput = (dateVar) => {
  const dateVal = prompt("Enter a date YYYY-MM-dd : ");
  if (!validate.date(dateVal)) {
    console.log("Invalid date".red);
    return dateInput(dateVar);
  }
  dateVar.date = dateVal;
};

const inputLoop = async () => {
  //reset repo list
  repoDataList = [];
  const filterOptions = {};
  const filterListInput = prompt(
    "Would you like to apply a filter by date?(y/n)"
  );

  if (!validate.bool(filterListInput)) {
    console.log("Please enter y or n".red);
    inputLoop();
  }

  const isFilteredList = filterListInput === "y" ? true : false;

  if (isFilteredList) {
    operatorInput(filterOptions);
    dateInput(filterOptions);
  }

  //get repo data into array

  await makeRepoDataList(isFilteredList, filterOptions);
  console.log(repoDataList);
  if (!repoDataList.length) {
    console.log("No results".bgCyan);
    delete filterOptions, isFilteredList;
    return inputLoop();
  } else {
    return;
  }
};


(async () => {
  // Authenticate octokit
  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated();
  console.log("Hello, %s", login);

  await inputLoop();
  const runConfirmedInput = prompt('Input GO to confirm and transfer list, press enter to cancel: ')

  if(runConfirmedInput === "ENTER"){
    await cloneRepoList(repoDataList);
  } 

  await inputLoop()
  

  // create github remote repo
  //   await createGitHubRepo(slug);
  //   const remoteUrl = `https://github.com/curtisgry/${slug}`;
  // clone repo from bitbucket
  //   await cloneRepo(clone);
  //for deleting folder later
  //   const repoPath = __dirname + `/${slug}.git`;
  //repo name and remote url
  //   await pushToGithub(slug, remoteUrl);



  //   console.log(`Finished! Here is the new GitHub repo: ${remoteUrl}`.green);
  //   console.log(repoDataList);
})();
