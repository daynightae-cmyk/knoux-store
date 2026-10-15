import type {ProviderProfile} from './types';
export function providerConnectionLabel(profile?:ProviderProfile):string{
 if(!profile)return 'NOT_CONFIGURED';
 const c=profile.connection;
 if(!profile.enabled)return 'DISABLED';
 if(c.lastErrorCategory==='RATE_LIMIT')return 'RATE_LIMITED';
 if(c.lastErrorCategory==='QUOTA_EXCEEDED')return 'QUOTA_EXCEEDED';
 if(c.lastErrorCategory==='BILLING_REQUIRED')return 'BILLING_REQUIRED';
 if(c.lastErrorCategory==='PERMISSION_DENIED')return 'PERMISSION_DENIED';
 if(c.auth==='FAILED')return 'FAILED';
 if(c.auth==='AUTHENTICATED'&&c.discovery==='DISCOVERY_VERIFIED')return 'VERIFIED';
 if(c.auth==='AUTHENTICATED'&&c.discovery==='FAILED')return 'FAILED';
 if(c.auth==='AUTHENTICATED')return 'SAVED_UNTESTED';
 if(c.health==='BLOCKED')return 'UNAVAILABLE';
 if(c.health==='LOCAL_RUNTIME_UNAVAILABLE')return 'UNAVAILABLE';
 if(c.configuration==='CONFIGURED')return 'SAVED_UNTESTED';
 return 'NOT_CONFIGURED';
}
