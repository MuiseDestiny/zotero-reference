var fs = require("fs");
var path = require("path");
var { zip } = require("compressing");
const data = require('../package.json')
var JavaScriptObfuscator = require('javascript-obfuscator');

const buildDir = __dirname.replace("scripts", "build")
const outfile = path.join(buildDir, `addon/chrome/content/scripts/${data.config.addonRef}.js`)
const option = {
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: [],
  stringArrayIndexesType: [
    'hexadecimal-number'
  ],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  disableConsoleOutput: true
}
setTimeout(async () => {
  setTimeout(() => fs.unlink(path.join(buildDir, `${data.name}.xpi`), (e) => { }))
  console.log("[1/4] Reading")
  const code = await fs.readFileSync(outfile, 'utf-8');
  console.log("[2/4] Obfuscating")
  const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, option).getObfuscatedCode()
  console.log("[3/4] Writing")
  await fs.writeFileSync(outfile, obfuscatedCode, 'utf-8');
  console.log("[4/4] Compressing")
  await zip.compressDir(
    path.join(buildDir, "addon"),
    path.join(buildDir, `${data.name}-for-user.xpi`),
    {
      ignoreBase: true,
    },
  );
  console.log("Done")
})