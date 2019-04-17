module.exports = function (plop) {
  plop.setGenerator('HelloWorld', {
    description: 'Creates a basic README with HelloWorld written in it.',
    prompts: [],
    actions: data => [
      {
        type: 'add',
        path: `temp/{{kebabCase appName}}/README.md`,
        templateFile: `plop-templates/metadata/README.md.hbs`
      }
    ]
  })
};
