import * as core from '@actions/core';
import * as gh from '@actions/github';
import { Octokit } from '@octokit/rest';
import retrieveDetails from './retrieve-details';
import fetch from 'node-fetch';

function cleanAndFormatDescription(description: string): string {
    return description
      .replace(/{noformat}/g, '```')  
      .replace(/\{(?!noformat)[^}]+\}/g, '') 
      .replace(/\*/g, '') 
      .replace(/!\S.*?!/g, '')  
      .replace(/^#{1,6} /gm, match => {
        const headingLevel = match.trim().length; 
        return `${'  '.repeat(headingLevel - 1)}- `;
      })
      .trim();
}


  function addDescriptionToBody(jiradesc: string, body: string) {
    const dividingLine = '---';
    const newJiraBlock = `**Jira Description** \n\n${jiradesc}\n\n${dividingLine}`;
    const escapedJiraDescription = `\\*\\*Jira Description\\*\\* \\n\\n([\\s\\S]*?)\\n${dividingLine}`;
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

    const title = jiraDetails.length === 1 ?`${jiraDetails[0].id} | ${jiraDetails[0].summary}` :  jiraDetails.map(jira => jira.id).join(' & ');
    const jiraDescriptions = jiraDetails.map(jira => `${jira.id}: ${jira.description}`).join('\n\n');
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
