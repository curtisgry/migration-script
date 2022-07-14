const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");
require("dotenv").config();
const colors = require("colors");
const validate = require("./lib/inputValidation");
const {extractDataToArray, getRepoData, delay} = require('./lib/helpers')

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

// Variables from .env
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


const cloneRepoList = async (arr) => {
  if (!arr.length) {
    console.log("Error repo list empty!".red);
    return;
  }
  for (const i in arr) {
     await migrateRepo(arr[i])
  }
};


const createGitHubRepo = async (repoName) => {
  console.log(`Creating GitHub repository...`.green);
  try {
    const res = await octokit.request(`POST /user/repos`, {
      name: repoName,
    });
    const {clone_url} = res.data;
    newRepoLinks.push(clone_url);

  } catch (error) {
    console.log(`${error}`.red);
  }
};


const importToGithub = async ({owner, vcs_username, vcs_password, repo, vcs_url}) => {
  console.log('Starting import to GitHub...')
  try {
    const res = await octokit.request(`PUT /repos/${owner}/${repo}/import`, {
      owner,
      repo: 'REPO',
      vcs: 'git',
      vcs_url,
      vcs_username,
      vcs_password
    })
    console.log(res.data.status_text)
  } catch (error) {
    console.log(error)
  }
  
}

//This one handles all the transfering
const migrateRepo = async (info) => {
  const {slug, url} = info;

  // create new repo on GitHub
  await createGitHubRepo(slug)

  // Import from Bitbucket
  await importToGithub({owner: ghUsername, vcs_username:username, vcs_password: password, repo: slug, vcs_url: url})

  //Complete status conditional for status update loop
  let completeStatus = false;

  // Get status from API during import
  while (!completeStatus) {

    // Delay timing here effects how often we get the status from the API
    await delay(1000)
    const res = await octokit.request(`GET /repos/${ghUsername}/${slug}/import`, {
      owner: 'OWNER',
      repo: 'REPO'
    })

    // Status check stuff and stop the loop
    if(res.data.status === 'complete') completeStatus = true
    if(res.data.status === 'error') {
    completeStatus = true
    console.log('Error'.red)
    console.log(res)
    }
    if(!res) {
      completeStatus = true;
      return console.log('Error during import no response from server')
    }

    // Log status each loop
    console.log(res.data.status_text)
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



 // Confirmation and input entry for list and single repo transfer
 let runConfirmedInput = null;
 let repoTransferId = null;
 let singleRepo = null;

//Main console input loop
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
      return inputLoop();
    }

    isFilteredList = filterListInput === "y" ? true : false;
  }

  //Set list filter options
  if (isFilteredList) {
    operatorInput(filterOptions);
    dateInput(filterOptions);
  }


  // If this prompt has already been set skip it
  if(isRepoList === null) {
    const singleOrListInput = prompt(
      "Would you like to transfer a list or single repo? (list,single):"
    );
  
    if(!validate.words(singleOrListInput, ['list', 'single'])){
      console.log('Invalid input'.red)
      return inputLoop();
    }
    isRepoList = singleOrListInput.toLowerCase() === "list" ? true : false;
  }
  
  
  //get repo data into array
  await makeRepoDataList(isFilteredList, filterOptions);

  //List repos to console and check if there were results
  console.log(repoDataList);
  if (!repoDataList.length) {
    console.log("No results".bgCyan);
    delete filterOptions, isFilteredList;
    return inputLoop();
  } 

  if(isRepoList) {
    runConfirmedInput = prompt('Input GO to confirm and transfer list, press enter to cancel: ')
  } else {
    repoTransferId = prompt('Enter ID number for the repo to transter:')

    if(validate.minMax(repoTransferId, 0, repoDataList.length - 1)){
      console.log('Invalid ID'.red)
      repoTransferId = null;
      return inputLoop()
    }

    singleRepo = repoDataList.find(repo => repo.id === parseInt(repoTransferId))
    console.log(singleRepo)
    runConfirmedInput = prompt('Input GO to confirm and transfer repo, press enter to cancel: ')
  }

  
};





(async () => {
  // Authenticate octokit
  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated();
  console.log("Hello, %s", login);

  //Recieve all inputs
  await inputLoop();
  
  //Final conditionals to run the import
  if(isRepoList && runConfirmedInput === "GO"){
    await cloneRepoList(repoDataList);
    newRepoLinks.forEach(link => {
      console.log(`Finished! Here is the new GitHub repo: ${link}`.green);
    })
  // Dont do it
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
