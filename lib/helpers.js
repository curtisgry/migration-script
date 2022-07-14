const axios = require('axios');

// Pull data needed from api response data
const extractDataToArray = (data, arr) => {
  if (!data) return console.log('No repos found with search.');
  let id = 0;
  data.values.forEach((val) => {
    const repoInfo = {
      slug: val.slug,
      url: val.links.html.href,
      dateUpdated: val.updated_on,
      id,
    };
    id++;
    // currently pushing into global const repoDataList
    arr.push(repoInfo);
  });
};

const getReposFilteredByDate = async ({
  username,
  password,
  workspace,
  operator,
  date,
}) => {
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

const getReposAll = async ({ username, password, workspace }) => {
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

const getRepoData = async ({
  username,
  password,
  workspace,
  operator,
  date,
}) => {
  if (operator && date) {
    return getReposFilteredByDate({
      username,
      password,
      workspace,
      operator,
      date,
    });
  }
  return getReposAll({ username, password, workspace });
};

//delay for checking import status get requests loop
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

module.exports = { extractDataToArray, getRepoData, delay };
