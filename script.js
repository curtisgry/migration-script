// const fs = require("fs");
// const prompt = require("prompt-sync")({ sigint: true });
require("dotenv").config();
const axios = require("axios");

// console.log('First, some info about your accounts...')
// const workspace = prompt('Enter the name of your Bitbucket workspace: ')
// const username = prompt('Enter your Bitbucket username: ')
// const password = prompt('Enter your app password: ')

// Variables for testing
const workspace = process.env.USERNAME;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;

// Will be populated with all address links
const repoAddressList = [];

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

// Returns only the href values for repo clone
const getRepoAddressList = async () => {
  const data = await getAllRepoData();
  data.values.forEach((val) => {
    repoAddressList.push(val.links.clone[0].href);
  });
};


(async () => {
    await getRepoAddressList()
    console.log(repoAddressList);
})();

