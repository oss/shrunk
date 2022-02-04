// @ts-check

/**
 * We use a script to run TypeDoc to ignore some compiler errors
 * https://github.com/TypeStrong/typedoc/issues/1403#issuecomment-734475220
 */
const td = require('typedoc');
const ts = require('typescript');


async function main() {
  const app = new td.Application();
  // For reading typedoc.json - optional
  app.options.addReader(new td.TypeDocReader());
  // For reading tsconfig.json - essential
  app.options.addReader(new td.TSConfigReader());

  app.bootstrap({
    // can put other options here too, or in typedoc.json/tsconfig.json
    options: 'typedoc.json',
    entryPoints: ['./src'],
  });


  // Application.convert checks for compiler errors here.

  const project = app.convert();

  app.generateDocs(project, './docs');
  app.generateJson(project, './docs.json');

}

main().catch(console.error);