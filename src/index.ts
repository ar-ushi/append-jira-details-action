import getDetailsForPr from './actions'; 
import * as core from '@actions/core';

getDetailsForPr().catch(e =>
    core.setFailed(e.message));
    
