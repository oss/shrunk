/**
 * This script fixes the ShareLinkModal component.
 * https://github.com/ant-design/ant-design/issues/22943#issuecomment-614483120
 */
const path = require('path');
const fs = require('fs');

const fileList = ['BodyContext.js', 'ResizeContext.js', 'TableContext.js'];
const folder = path.resolve(__dirname, '../node_modules/rc-table/es/context');

fileList.forEach((item) => {
  const file = path.resolve(folder, item);
  const context = fs.readFileSync(file).toString();
  if (!/console/gm.test(context)) {
    fs.writeFileSync(file, `${context}console.log('${item}')`);
  }
});
