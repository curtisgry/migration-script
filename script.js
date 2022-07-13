const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const colors = require("colors");
const validate = require("./lib/inputValidation")

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
const workspace = process.env.WORKSPACE;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const ghUsername = process.env.GH_USERNAME;

// Will be populated with all address links
const repoDataList = [];

// Returns all data for repos from the api
const getAllRepoData = async () => {
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
const getReposByDate = async ({ operator, date }) => {
  try {
    const res = await axios.get(
      `https://api.bitbucket.org/2.0/repositories/${workspace}?&q=updated_on${operator}${date}`,
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

//Pull data needed from api response data
const extractDataToArray = (data, arr) => {
  if (!data) return console.log("No repos found with search.");
  let id = 0;
  data.values.forEach((val) => {
    const repoInfo = {
      slug: val.slug,
      clone: val.links.clone[0].href,
      dateUpdated: val.updated_on,
      id,
    };
    id++;
    //currently pushing into global const repoDataList
    arr.push(repoInfo);
  });
};

//Populate repoDataList with slug and clone url
const makeRepoDataList = async (filter, filterOptions) => {
  let data;
  if (filter && filterOptions) {
    data = await getReposByDate(filterOptions);
  } else {
    data = await getAllRepoData();
  }
  extractDataToArray(data, repoDataList);
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

const checkOperatorInput = (op) => {
  //Regex for comparison operators
  const regex = /^(\!=|=|>|<|>=|<=)$/;
  if (!op.match(regex)) return false;
  return true;
};

const checkDateInput = (date) => {
  //Regex for date format
  const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  if (!date.match(regex)) return false;
  return true;
};

const checkInputBool = (letter) => {
    const regex = /^(y|n)$/;
  if (!letter.match(regex)) return false;
  return true;
}

const operatorInput = (operatorVar) => {
  const operator = prompt("Enter an operator[ = , != , >  , >=  , <= ] : ");

  if (!validate.operator(operator)) {
    console.log("Invalid operator".red);
    operatorInput(operatorVar);
  }
  operatorVar.operator = operator;
};

const dateInput = (dateVar) => {
  const dateVal = prompt("Enter a date YYYY-MM-dd : ");
  if (!validate.date(dateVal)) {
    console.log("Invalid date".red);
    dateInput(dateVar);
  }
  dateVar.date = dateVal;
};

const inputLoop = async () => {
  //for testing
  const filterOptions = {};
  const isFilteredList = prompt("Would you like to apply a filter by date?(y/n)")


  if (isFilteredList) {
    operatorInput(filterOptions);
    dateInput(filterOptions);
  }
  console.log(filterOptions);

  //get repo data into array

  await makeRepoDataList(isFilteredList, filterOptions);
  // console.log(repoDataList)
  if (!repoDataList.length) {
    console.log("No results".bgCyan);
    inputLoop();
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

  const { clone, slug } = repoDataList[0];
  // create github remote repo
  //   await createGitHubRepo(slug);
  const remoteUrl = `https://github.com/curtisgry/${slug}`;
  // clone repo from bitbucket
  //   await cloneRepo(clone);
  //for deleting folder later
  const repoPath = __dirname + `/${slug}.git`;
  //repo name and remote url
  //   await pushToGithub(slug, remoteUrl);

  // Cleanup! delete directory
  //   await fs.rmdir(repoPath, { recursive: true }, (err) => {
  //     if (err) {
  //       throw err;
  //     }
  //     console.log(`Removing ${slug} directory...`);
  //   });

  //   console.log(`Finished! Here is the new GitHub repo: ${remoteUrl}`.green);
  console.log(repoDataList);
})();
