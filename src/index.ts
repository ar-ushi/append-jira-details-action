import {getDetailsForPr} from './actions'; 
import core from '@actions/core';

getDetailsForPr().catch(e =>
    core.setFailed(e.message));
    
