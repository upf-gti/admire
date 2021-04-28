
//import AdapterJS from 'adapterjs';
import { RtcClient }    from "./rtcClient.js";      // eslint-disable-line
import { AppClient }    from './appClient.js';      // eslint-disable-line
import { MediaAdapter } from "./mediaAdapter.js";   // eslint-disable-line
import { DummyStream }  from "./dummyStream.js";

let rtcClient    = window.rtcClient    = new RtcClient(),
    appClient    = window.appClient    = new AppClient(),
    mediaAdapter = window.mediaAdapter = new MediaAdapter(),
    dummyStream  = window.dummyStream  = new DummyStream(); 

    appClient.DEBUG = false;
    rtcClient.DEBUG = false;
    mediaAdapter.DEBUG = false;

export {
   rtcClient, 
   appClient,
   mediaAdapter,
   dummyStream
}