import * as core from '@actions/core';
import * as gh from '@actions/github';
import { Octokit } from '@octokit/rest';
import retrieveDetails from './retrieve-details';

export default async getDetailsForPr => {
 try {
    const GHtoken = core.getInput('token', {required: true});
    const jid = core.getInput('jiraId', {required: true});
    const orgUrl = core.getInput('orgUrl', {required: true});
    const jiraToken = core.getInput('jiraToken', {required: true});  
    const assigneeName = core.getInput('assigneeName', {required: true});
    const authToken = Buffer.from(`${assigneeName}:${jiraToken}`).toString('base64');
    const client = new Octokit({
        auth: GHtoken
    })
    const {context} = gh;
    const jiraAPIUrl = `${orgUrl}/rest/api/2/issue/${jid}`;
    const fields = await retrieveDetails({
        authToken,
        jiraAPIUrl
    })
 } catch (error) {
    
 }   
}