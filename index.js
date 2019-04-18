'use strict';

/**
 * ###############################################
 *          ENVIRONMENT VARIABLE BINDING.
 * ###############################################
 */

const { GITHUB_USER, GITHUB_URL, GITHUB_TOKEN, GITHUB_SSH_KEY } = process.env;
const PORT = process.env.PORT || 3000;

/**
 * ###############################################
 *          SERVER IMPORT REQUIREMENTS.
 * ###############################################
 */
// Server required.
const express = require('express');

// Plop generation libraries.
const nodePlop = require('node-plop');
const plop = nodePlop('./plopfile.js');

// Github required
const GitHub = require('github-api');

// child process spawner.
const { execSync } = require('child_process');

/**
 * ###############################################
 *            SERVER SETUP & MIDDLEWARE
 * ###############################################
 */
const server = express()
server.use(express.json());

/**
 * ###############################################
 *                  SERVER PATHS
 * ###############################################
 */
// Base path get request.
server.get('/', (req, res) => {
  res.status(200).send({
    "success": true,
    "message": `Version 0.0.1 - ${process.env.APP_NAME} - Running.`
  });
})

// Test request.
server.post('/create-app', async (req, res) => {

  // Receive request.
  console.info("[ /create-app ] Received:");
  console.log(req.body);
  const { appName, appType } = req.body;
  if (appName) {
    const formattedAppName = appName.replace(/ /g, "-").toLowerCase();
    const formattedAppType = appType.replace(/ /g, "-").toLowerCase();

    /**
     * ###############################################
     *             PROJECT GENERATION.
     * ###############################################
     */
    // ::Flag:: to make sure we don't push up empty/non-existent projects.
    let appCreated = false;
    switch (formattedAppType) {
      // case "react":
      //   console.info("INFO: appType has been identified as react.")
      //   break;
      //   // We run create-react-app when type is react.

      //   // execSync(`npx create-react-app ./temp/${formattedAppName}`, {
      //   //   cwd: './',
      //   //   env: process.env
      //   // });
      //   // console.info("INFO: react-app created successfully.");
      // case "spring":
      //   console.info("INFO: appType has been identified as spring.");
      //   break;
      default:
        console.info("INFO: Generating HelloWorld.");
        const generator = plop.getGenerator('HelloWorld');
        try {
          await generator.runActions({
            appName: formattedAppName,
            type: appType
          }).then(results => {
            if (Array.isArray(results.failures) && (results.failures.length > 0)) {
              throw Error(`ERROR: GENERATION ERROR:` + JSON.stringify(results.failures));
            }
          }).catch(err => { throw err; });

          console.info(`INFO: Creation of project ${formattedAppName} completed.`)
          appCreated = true;
        } catch (err) {
          console.error(err);
          res.status(500).send({
            success: false,
            message: "Application creation failed, I think the monkeys at JLR-DDC did something silly."
          });
        }
    }

    if (appCreated) {
      /**
       * ###############################################
       *             GITLAB HANDLING.
       * ###############################################
       */
      const simpleGit = require('simple-git')(`./temp/${formattedAppName}`)
      const projectRepo = `${GITHUB_URL}:${GITHUB_USER}/${formattedAppName}.git`;

      console.info(`INFO: AUTHENTICATING WITH GITHUB`);
      const githubConnector = new GitHub({
        username: GITHUB_USER,
        token: GITHUB_TOKEN
      });
      console.info(`INFO: Creating repository ${projectRepo}`);

      const githubUser = githubConnector.getUser();
      // initialize repo
      await githubUser.createRepo({
        name: `${formattedAppName}`,
        description: "This was created by PLOP-SKOOF.",
        private: false,
        has_wiki: false
      }).then((response) => {
        console.info(`INFO: Repository created; pushing...`);
        const { html_url,    } = response.data;

        // Push the repository.
        try {
          simpleGit.init().add('.').commit("initial commit").push(
            ssh_url, "master", {
              "--set-upstream": true
            },
            (err, result) => {
              const fs = require('fs');
              const files = fs.readdirSync(`./temp/${formattedAppName}`);
              console.info("INFO: Cleaning up...");
              if (Array.isArray(files) && (files.length > 0)) {
                console.info(`INFO: removing 'temp/${formattedAppName}'`);
                execSync('rm -rf ./temp/*', {
                  cwd: './'
                });
              }
              console.info("INFO: Cleanup completed.")
              if (err) throw Error;
              console.info("INFO: " + result);
            }
          );
          console.info(`INFO: Push complete, application created at ${html_url}`);
          res.status(200).send({
            success: true,
            message: `Application created at ${html_url}`
          });
        } catch (err) {
          throw Error("Git init failed.")
        }
      }).catch(err => {
        console.error(err);
        res.status(500).send({
          success: false,
          message: "Application failed to initialize git."
        })
      });
    }
  } else {
    res.status(422).send({
      success: false,
      message: `No 'appName' defined.`
    });
  }
});

server.get("/swag", (req, res) => {
  res.sendFile("./easter-egg.html");
});


/**
 * ###############################################
 *             SERVER INITIALIZATION.
 * ###############################################
 */
server.listen(
  PORT, () => {
    console.log(`Application starting targetting: ${GITHUB_URL}`);
    console.log('Application started -- awaiting requests.');
  });