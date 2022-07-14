# Migration Script

## Bitbucket To GitHub Repo Transfer

This is a work-in-progress tool to migrate repositories from Bitbucket to GitHub.

- Currently only works for single repository to public GitHub account for testing.
- Just a demo at this point.
- Needs some good refactoring

### Setup

- Clone repo to local computer and npm install.
- Create a .env file in the root directory with the following variables. The bitbucket app password can be generated [here](https://bitbucket.org/account/settings/app-passwords/). Set up GitHub access token guide [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

```
PASSWORD=<bitbucket app password>
USERNAME=<bitbucket-username>
WORKSPACE=<bitbucket-workspace-name>
GH_USERNAME=<github-username>
GH_ACCESS_TOKEN=<github-access-token>
```

- Start the script

```
npm start
```
