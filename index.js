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
server.get('/', (req, res)  => {
  res.status(200).send({
    "success": true,
    "message": `Version 0.0.1 - ${process.env.APP_NAME} - Running.`
  });
})

// Test request.
server.post('/create-app', (req, res) => {
  console.log("[ /create-app ] Received:");
  console.log(req.body);

  const { appName } = req.body;
  if ( appName ) {
    const formattedAppName = appName.replace(/ /g, "_");
    // hardcoded generator -- can be changed.
    const generator = plop.getGenerator('HelloWorld');

    generator.runActions(req.body).then(results => {
      if ( Array.isArray(results.failures) && (results.failures.length > 0)) {
        console.error("ERROR CREATING")
        console.log(results.failures);
        res.status(500).send({
          success: false,
          message: "Application creation failed, I think the monkeys at JLR-DDC did something silly."
        });
      } else {
        /**
         * ###############################################
         *             GITLAB HANDLING.
         * ###############################################
         */
        const simpleGit = require('simple-git')(`./temp/${formattedAppName}`)
        const projectRepo = `${GITHUB_URL}:${GITHUB_USER}/${formattedAppName}.git`;

        console.log(`Pushing created repo to ${projectRepo}`)
        const githubConnector = new GitHub({
          username: GITHUB_USER,
          token: GITHUB_TOKEN
        });

        const githubUser = githubConnector.getUser();
        // initialize repo
        githubUser.createRepo({
          name: `${formattedAppName}`,
          description: "This was created by SKOOF.",
          private: false,
          has_wiki: false
        }).then((response) => {
          const { html_url, ssh_url } = response.data;

          // Push the repository.
          simpleGit.init().add('.').commit("initial commit").push(
            ssh_url, "master",{
              "--set-upstream": true
            },
            (err, result) => {
              console.log("HAS ERROR?");
              console.log(err);

              console.log("HAS RESULT?");
              console.log(result);
            }
          );

          res.status(200).send({
            success: true,
            message: `Application created at ${html_url}`
          });
        }).catch((error) => {
          console.log("ERROR:");
          console.log(error);
        });
      }
    });
  } else {
    res.status(422).send({
      "success": false,
      "message": "No `appName` defined."
    });
  }
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