'use strict';

const fs = require('node:fs');

const [outputFile, ...inputFiles] = process.argv.slice(2);

if (!outputFile || inputFiles.length === 0) {
  throw new Error('Usage: combine-reports.js OUTPUT INPUT...');
}

const reports = inputFiles.map((inputFile) =>
  JSON.parse(fs.readFileSync(inputFile, 'utf8')),
);

const results = {};
for (const report of reports) {
  for (const [url, issues] of Object.entries(report.results)) {
    if (url in results) {
      throw new Error(`Duplicate Pa11y URL in reports: ${url}`);
    }
    results[url] = issues;
  }
}

const combined = {
  total: reports.reduce((total, report) => total + report.total, 0),
  passes: reports.reduce((passes, report) => passes + report.passes, 0),
  errors: reports.reduce((errors, report) => errors + report.errors, 0),
  results,
};

fs.writeFileSync(outputFile, JSON.stringify(combined));
