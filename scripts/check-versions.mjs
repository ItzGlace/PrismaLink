import fs from 'node:fs';
const version=JSON.parse(fs.readFileSync('package.json')).version;
const config=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json'));
for(const file of ['src-tauri/Cargo.toml','crates/core/Cargo.toml'])if(!fs.readFileSync(file,'utf8').includes(`version = "${version}"`))throw Error(`Version mismatch: ${file}`);
if(config.version!==version)throw Error('Tauri version mismatch');
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==`v${version}`)throw Error('Tag must match all package versions');
console.log(`Version ${version} is consistent.`);
