# Asana project csv export
Export the title, section, description and comments of tasks
in an asana project to csv.
## Installation
Either install using `npm install -g` inside the project directory 
or run the script directly: `node .\src\index.js`
## Usage
You can provide the project id and the api key as arguments or you
can just run the command. It will prompt you for both.
The api key is saved inside the systems default user config
directory.

Usual locations by OS:

 - macOS: ~/Library/Preferences/asana-csv-nodejs
 - Windows: %APPDATA%\asana-csv-nodejs\Config
 - Linux: ~/.config/asana-csv-nodejs (or $XDG_CONFIG_HOME/asana-csv-nodejs)


```
Usage: asana-export [options] [project] [api_key]

CLI for exporting asana projects

Arguments:
  project     The asana project id
  api_key     The asana api key

Options:
  -e, --excludeCompleted  Excludes completed tasks from being exported
  -h, --help  display help for command
```
