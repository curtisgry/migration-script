const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");
require("dotenv").config();
const colors = require("colors");
const validate = require("./lib/inputValidation");
const {extractDataToArray, getRepoData} = require('./lib/helpers')

const simpleGit = require("simple-git");
simpleGit().clean(simpleGit.CleanOptions.FORCE);

const { Octokit } = require("octokit");




// Maybe use input for account info later instead of .env variables??
// console.log('First, some info about your accounts...')
// const username = prompt('Enter your Bitbucket username: ')
// const password = prompt('Enter your Bitbucket app password: ')
// const workspace = prompt('Enter the name of your Bitbucket workspace: ')
// const ghUsername = prompt('Enter your Github username: ')
// const ghAccessToken = prompt('Enter your Github personal access token: ')




//delay for testing
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// Variables for testing
const workspace = process.env.WORKSPACE;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const ghUsername = process.env.GH_USERNAME;
const ghAccessToken =  process.env.GH_ACCESS_TOKEN 

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: ghAccessToken});

// Global variables
let repoDataList = [];
let newRepoLinks = [];
let isRepoList = null;
let isFilteredList = null;



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
    const link = await createGitHubRepo(slug);
    newRepoLinks.push(link)
    await pushToGithub(slug, clone);
  }
};





const createGitHubRepo = async (repoName) => {
  console.log(`Creating GitHub repository...`.green);
  try {
    // will return data containing remote url probably better to use later
    const test = await octokit.request(`POST /user/repos`, {
      name: repoName,
    });
    
    const {clone_url} = test;
    return clone_url;

  } catch (error) {
    console.log(`${error}`.red);
  }
};





async function pushToGithub(gitName, remoteUrl) {
  if(!gitName && remoteUrl) return console.log('Error, missing name or url'.red)
  // workingDir to set path for simpleGit
  const workingDir = __dirname + `/repos/${gitName}.git`;
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

  //Init filter options
  const filterOptions = {};

  // If this prompt has already been set skip it
  if(isFilteredList === null) {
    const filterListInput = prompt(
      "Would you like to apply a filter by date?(y/n):"
    );
   
  
    if (!validate.bool(filterListInput)) {
      console.log("Please enter y or n".red);
      await inputLoop();
    }
    isFilteredList = filterListInput === "y" ? true : false;
  }


  if (isFilteredList) {
    operatorInput(filterOptions);
    dateInput(filterOptions);
  }

  const singleOrListInput = prompt(
    "Would you like to transfer a list or single repo? (list,single):"
  );


  if(!validate.words(singleOrListInput, ['list', 'single'])){
    console.log('Invalid input'.red)
    await inputLoop();
  }
  isRepoList = singleOrListInput.toLowerCase() === "list" ? true : false;

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
  


  // Confirmation and input entry for list and single repo transfer
  let runConfirmedInput = null;
  let repoTransferId = null;
  let singleRepo = null;
  console.log('is repo list', isRepoList)
  if(isRepoList) {
    runConfirmedInput = prompt('Input GO to confirm and transfer list, press enter to cancel: ')
  } else {
    repoTransferId = prompt('Enter ID number for the repo to transter:')
    singleRepo = repoDataList.find(repo => repo.id === parseInt(repoTransferId))
    console.log(singleRepo)
    runConfirmedInput = prompt('Input GO to confirm and transfer repo, press enter to cancel: ')
  }
  

  if(isRepoList && runConfirmedInput === "GO"){
    await cloneRepoList(repoDataList);
    newRepoLinks.forEach(link => {
      console.log(`Finished! Here is the new GitHub repo: ${link}`.green);
    })
    
  }else if (runConfirmedInput !== "GO") {
    console.log('No GO!'.red)
    await inputLoop()
  } else {
    await cloneRepoList([singleRepo])
    console.log(`Finished! Here is the new GitHub repo: ${newRepoLinks}`.green);
  }
    
  console.log('Goodbye!'.america)


  //   console.log(repoDataList);
})();
