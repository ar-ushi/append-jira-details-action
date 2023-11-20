import * as core from '@actions/core';

interface getDetailsInput{
    authToken: string;
    jiraAPIUrl: string;
}

interface Fields{
    [key: string] : any;
}

export default async ({authToken, jiraAPIUrl} : getDetailsInput): Promise<Fields>=> {
try {
    core.info('fetching details...');
    const response = await fetch(jiraAPIUrl, {
        headers: {
           Authorization: `Basic ${authToken}`
        }
    })
    if (response.ok){
        const {fields} = await response.json();
        return fields;
    } else {
        throw new Error ('No response from Jira API');
    }
} catch (error) {
    core.setFailed(error.message);
    process.exit(1);
}
};
