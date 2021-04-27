
//import AdapterJS from 'adapterjs';
import { RtcClient }    from "./rtcClient.js";      // eslint-disable-line
import { AppClient }    from './appClient.js';      // eslint-disable-line
import { MediaAdapter } from "./mediaAdapter.js";   // eslint-disable-line
import { DummyStream }  from "./dummyStream.js";

let rtcClient    = new RtcClient(),
    appClient    = new AppClient(),
    mediaAdapter = new MediaAdapter(),
    dummyStream  = new DummyStream(); 
    //appClient.DEBUG = false;

export {
   rtcClient, 
   appClient,
   mediaAdapter,
   dummyStream
}