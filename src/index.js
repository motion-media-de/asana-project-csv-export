import {program} from "commander";
import Enquirer from "enquirer";
import Conf from "conf";
import Asana from "asana";
import CliProgress from "cli-progress";
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import chalk from "chalk";

const CONFIG_API_KEY = "api-key";
const config = new Conf({projectName: "asana-csv"});

program
    .name("asana-export")
    .description("CLI for exporting asana projects")
    .argument("[project]", "The asana project id")
    .argument("[api_key]", "The asana api key")
    .option("-e, --excludeCompleted", "Excludes completed tasks from being exported");


program.parse();

let [project, apiKey] = program.args;
const excludeCompleted = program.opts().excludeCompleted;

if (apiKey == null)
    apiKey = config.get(CONFIG_API_KEY);

if (apiKey == null)
{
    ({ apiKey } = await Enquirer.prompt({
       type: "input",
       name: "apiKey",
       message: "Enter your asana api key. It will be saved for future exports."
    }));

    config.set(CONFIG_API_KEY, apiKey);
}

if (project == null)
{
    const validationExp = new RegExp("\\D+");
    ({ project } = await Enquirer.prompt({
        type: "input",
        name: "project",
        message: "Enter the project id. It can be copied from a task url",
        validate: value => !validationExp.test(value)
    }));
}

const client = Asana.ApiClient.instance;
const auth = client.authentications['oauth2'];
auth.accessToken = apiKey;

const taskApi = new Asana.TasksApi();
const storiesApi = new Asana.StoriesApi();

let count = 1;
let offsetToken = null;
let tasks = [];

do {

    process.stdout.write(`Fetching tasks: Page ${count} \r`)

    let data = await asyncGetTasks(50, offsetToken, excludeCompleted);
    offsetToken = data.next_page?.offset ?? undefined;
    tasks.push(...data.data);

    count++;

} while (offsetToken != null)

process.stdout.write("\n");
console.log("Fetching comments:")

const progress = new CliProgress.SingleBar({}, CliProgress.Presets.rect);
progress.start(tasks.length, 0);

for (const task of tasks) {

    let responseData = await asyncGetStories(task.gid);
    task.stories = responseData.data;

    progress.increment(1);
}

progress.stop();

console.log("Processing task data:")
progress.start(tasks.length, 0);

const commentSequence = Array(20).fill()
    .map((element, index) => `story-${index + 1}`);

//Insert header for csv
let data = [["name", "description", "type", ...commentSequence]];

for (const task of tasks) {

    progress.increment(1, task.name);

    let entry = {
        name: task.name,
        description: task.notes,
        type: task.memberships[0]?.section.name,
    };

    let storyIndex = 0;
    for (const story of task.stories) {
        if (story.resource_subtype !== "comment_added")
            continue;

        entry[`story-${storyIndex}`] = story.text;
        storyIndex++;
    }

    data.push(entry);
}

progress.stop();

let csv = stringify(data, {
    columns: [ "name", "description", "type", ...commentSequence]
})

fs.writeFile(`export-${Date.now()}.csv`, csv, 'utf8', err => {
    console.log(err ? err : chalk.green("Export finished!"));
});

/**
 * Fetches a list of tasks
 * @param limit { number } Max. 100
 * @param offset { string }
 * @param excludeCompleted { boolean }
 * @returns {Promise<TaskResponseArray>}
 */
function asyncGetTasks(limit, offset, excludeCompleted)
{
    return new Promise((resolve, reject) => {
        taskApi.getTasks({
            limit: limit,
            project: project,
            offset: offset,
            opt_fields: ["name", "completed", "memberships.section.name", "notes"],
            // A bit hacky but allows filtering by incomplete without having to use the search api
            completed_since: excludeCompleted ? new Date().toISOString() : null
        }, (error, data, response) => {
            if (error != null)
            {
                reject(error);
                return;
            }

            resolve(data);
        });
    });
}

/**
 *
 * @param taskId {string}
 * @returns {Promise<StoryResponseArray>}
 */
function asyncGetStories(taskId)
{
    return new Promise((resolve, reject) => {
        storiesApi.getStoriesForTask(taskId, {}, (error, data, response) => {
            if (error != null)
            {
                reject(error);
                return;
            }

            resolve(data);
        });
    });
}
