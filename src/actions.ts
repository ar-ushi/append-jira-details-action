import * as core from '@actions/core';
import * as gh from '@actions/github';
import { Octokit } from '@octokit/rest';
import retrieveDetails from './retrieve-details';
import fetch from 'node-fetch';

function cleanAndFormatDescription(description: string): string {
    return description
        .replace(/{(noformat|code)}/g, '```')  
        .replace(/^\{(?!noformat|code)[^}]+\}.*$/gm, '') 
      .replace(/\*/g, '') 
      .replace(/!\S.*?!/g, '')  
      .replace(/\[~accountid:[^\]]+\]/g, '')   
      .replace(/^#{1,6} /gm, match => {
        const headingLevel = match.trim().length; 
        return `${'  '.repeat(headingLevel - 1)}- `;
      })
      .trim();
}
//The above has basically n number of iterations but I have tried to focus on the most important ones

function addDescriptionToBody(jiradesc: string, body: string) {
    const dividingLine = '---';
    const newJiraBlock = `**Jira Description** \n\n${jiradesc}\n\n${dividingLine}`;
    const escapedJiraDescription = `\\*\\*Jira Description\\*\\*\\s*\\n\\s*([\\s\\S]*?)\\s*\\n${dividingLine}`;
    const regex = new RegExp(escapedJiraDescription, 'm');

    if (regex.test(body)) {
        return body.replace(regex, newJiraBlock);
    } else {
        return `${newJiraBlock}\n\n${body}`;
    }
}

export default async function getDetailsForPr() {
 try {
    interface JiraDetail {
        id: string;
        summary: string;
        description: string;
        issueType: string;
        fixVersions: Array<string>,
    }      
    const GHtoken = core.getInput('token', {required: true});
    const jiraKey = core.getInput('jiraKey', { required: true }).split(',').map(key => key.trim());
    const orgUrl = core.getInput('orgUrl', {required: true});
    const jiraToken = core.getInput('jiraToken', {required: true});  
    const username= core.getInput('username', {required: true});
    const authToken = Buffer.from(`${username}:${jiraToken}`).toString('base64');
    const maxDescChars = parseInt(core.getInput('maxDescChars'))
    const maxTitleChars = parseInt(core.getInput('maxTitleChars'))
    const jiraIdCutoff = parseInt(core.getInput('jiraIdCutoff'))

    const client = new Octokit({
        auth: GHtoken,
        request: {
            fetch,
        }
    })
    const { context } = gh;
    const owner = context!.payload!.repository!.owner.login;
    const pull_number = context!.payload!.pull_request!.number;
    const repo = context!.payload!.pull_request!.base.repo.name;
    const bodyContent = context!.payload.pull_request!.body;
    const branch_name = context.payload!.pull_request!.head.ref;
    const pullRequestTitle = context.payload!.pull_request!.title;
    let jiraIds = new Set();
    let jiraDetails: JiraDetail[] = [];
    
    const { data: commits } = await client.rest.pulls.listCommits({
        owner,
        repo,
        pull_number
    });

    const commitMessages = commits.map(commit => commit.commit.message);
    const extractJiraIds = (text: string, key: string) => {
        const matches = text.match(new RegExp(`${key}-\\d+`, 'g'));
        if (matches) {
            matches.forEach((match: string) => jiraIds.add(match));
        }
    };
        jiraKey.forEach(key => {
            commitMessages.forEach(msg => extractJiraIds(msg, key));
            extractJiraIds(pullRequestTitle, key);
            extractJiraIds(branch_name, key)
        });
    
    if (jiraIds.size === 0) {
        throw new Error(`Could not find any Jira IDs matching any of the Jira keys: ${jiraKey.join(', ')}`);
    }
    for (const jiraId of jiraIds) {
        const jiraAPIUrl = `${orgUrl}/rest/api/2/issue/${jiraId}`;
        const fields = await retrieveDetails({
          authToken,
          jiraAPIUrl,
    });
        const fixVersions = fields.fixVersions?.map((fv: { name: string; }) => fv.name);
        let desc = fields.summary;
        if (fields.description && fields.description.trim() !== '') {
            desc = cleanAndFormatDescription(fields.description);
        } 
        jiraDetails.push({id: jiraId as string, summary: fields.summary, description: desc, issueType: fields.issuetype.name, fixVersions: fixVersions})
    }

        const formattedTitle = jiraDetails.length === 1
        ? `${jiraDetails[0].id} | ${jiraDetails[0].summary}`
        : jiraDetails.map(jira => jira.id).join(' & ');
    
    const formattedTitleLength = formattedTitle.length;
    
    const title = !isNaN(maxTitleChars) && formattedTitleLength > maxTitleChars && jiraDetails.length === 1 
        ? jiraDetails[0].id
        : formattedTitle;
    let jiraDescriptions;
    const jiraBaseUrl = `${orgUrl}/browse/`;

    if (!isNaN(jiraIdCutoff) && jiraDetails.length > jiraIdCutoff) {
        jiraDescriptions = jiraDetails
            .map(jira => `[${jira.id}](${jiraBaseUrl}${jira.id}) - ${jira.summary}`)
            .join('\n\n');
    } else {
        jiraDescriptions = jiraDetails
            .map(jira => `[${jira.id}](${jiraBaseUrl}${jira.id}) - ${jira.description}`)
            .join('\n\n');
    }    
    if (!isNaN(maxDescChars) && maxDescChars > 0) {
        jiraDescriptions = jiraDescriptions.length > maxDescChars
          ? jiraDescriptions.substring(0, maxDescChars) + '...' 
          : jiraDescriptions;
      }
      
    const issueTypes = jiraDetails.map(jira => jira.issueType.toLowerCase());
    const fixVersions = jiraDetails.map(jira => jira.fixVersions || []).flat();
    
    const labelsToAdd = [...issueTypes, ...fixVersions];

    // const body = `**Jira Description** \n\n${jiraDescriptions}\n\n## ${bodyContent}`;
    const body = addDescriptionToBody(jiraDescriptions, bodyContent!);
    await client.rest.pulls.update({
        owner,
        repo,
        pull_number,
        title,
        body, 
    })
    await client.rest.issues.addLabels({
        owner,
        repo,
        issue_number : pull_number,
        labels: labelsToAdd.filter(label => label)
    })
 } catch (error : any) {
    core.setFailed(`process failed with ::: ${error.message}`);
 }   
}
