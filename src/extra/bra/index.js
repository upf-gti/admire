// eslint-disable

//import AdapterJS from 'adapterjs';
import { RTCEvent, RTCClient }    from "./rtcClient.js";      // eslint-disable-line
import { LobbyClient }  from './lobbyClient.js';      // eslint-disable-line
import { MediaAdapter } from "./mediaAdapter.js";   // eslint-disable-line
import { DummyStream }  from "./dummyStream.js";

let appClient    = window.appClient    = new LobbyClient(),
    mediaAdapter = window.mediaAdapter = new MediaAdapter(),
    dummyStream  = window.dummyStream  = new DummyStream(),
    rtcClient    = window.rtcClient    = new RTCClient({ debug: true, defaultStream: dummyStream.getStream() });

    appClient.DEBUG = false;
    rtcClient.DEBUG = false;
    mediaAdapter.DEBUG = false;

export {
   RTCEvent,
   rtcClient, 
   appClient,
   mediaAdapter,
   dummyStream
}