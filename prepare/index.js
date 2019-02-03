#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const execa = require("execa");
const pAll = require("p-all");
const rimraf = require("rimraf").sync;
const mkdir = require("mkdirp").sync;
const minimist = require("minimist");
const { getIcon } = require("./fetching.js");
const { convertFetchedIconToPNG } = require("./converting.js");
const DOMAINS = require("./domains.json");

const { process: fetchProcess = "all" } = minimist(process.argv.slice(2));
const { fetch: domainsToFetch, match: domainsToMatch, resolve: domainResolution } = DOMAINS;
const OUTPUT = path.resolve(__dirname, "../resources");
const IMAGES = path.join(OUTPUT, "images");

console.log(`Will fetch: ${fetchProcess}`);

console.log("Preparing...");
if (fetchProcess === "all") {
    rimraf(OUTPUT);
    mkdir(OUTPUT);
    mkdir(IMAGES);
}
const manifest = fetchProcess === "missing"
    ? require(path.join(OUTPUT, "index.json"))
    : {
        domains: {},
        match: domainsToMatch
      };
const existingDomains = Object.keys(manifest.domains);
console.log("Fetching icons...");

const failures = [];
const actions = domainsToFetch
    .filter(domain => existingDomains.includes(domain) === false)
    .map(domain => () => {
        const fetchURL = domainResolution[domain] || domain;
        console.log(`Fetching icon: ${domain} (${fetchURL})`);
        return getIcon(fetchURL)
            .then(icon => Promise.all([
                Promise.resolve(icon),
                new Promise((resolve, reject) => {
                    const domainFilename = `${domain.replace(/\./g, "_")}.png`;
                    fs.writeFile(path.join(IMAGES, domainFilename), icon.data, err => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(domainFilename);
                    });
                }),
                new Promise((resolve, reject) => {
                    const domainFilename = `${domain.replace(/\./g, "_")}.grey.png`;
                    fs.writeFile(path.join(IMAGES, domainFilename), icon.dataGrey, err => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(domainFilename);
                    });
                })
            ]))
            .then(([icon, filename, filenameGreyscale]) => {
                manifest.domains[domain] = {
                    filename,
                    filenameGreyscale,
                    url: icon.url,
                    updated: (new Date()).toISOString()
                };
            })
            .catch(err => {
                console.error(err.message);
                failures.push(domain);
            });
    });

pAll(actions, { concurrency: 4 })
    .then(() => execa("/bin/cp", [
        path.join(__dirname, "./{default.png,default.grey.png}"),
        path.join(IMAGES, "/")
    ], { shell: true }))
    .then(() => new Promise((resolve, reject) => {
        fs.writeFile(path.join(OUTPUT, "index.json"), JSON.stringify(manifest, undefined, 2), err => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    }))
    .then(() => {
        if (failures.length > 0) {
            console.error(`Failed to build ${failures.length} domains:\n\t${failures.join(", ")}`);
            process.exit(2);
        }
        console.log("Finished");
    });
