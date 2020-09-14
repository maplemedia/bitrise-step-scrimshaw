'use strict';

const fs = require('fs');

let rawdata = fs.readFileSync('ivory_module_definition.json');
let module_definition = JSON.parse(rawdata);
console.log(module_definition);