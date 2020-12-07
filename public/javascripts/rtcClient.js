var PeerManager = (function () {

  var localId,
      config = {
        peerConnectionConfig: {
          iceServers: [
            {"url": "stun:23.21.150.121"},
            {"url": "stun:stun.l.google.com:19302"}
          ]
        },
        peerConnectionConstraints: {
          optional: [
            {"DtlsSrtpKeyAgreement": true}
          ]
        }
      },
      peerDatabase = {},
      localStream,
      remoteVideoContainer = document.getElementById('remoteVideosContainer'),
      socket = io(),
      // socket = io('http://localhost:7003/socket.io?apiKey='+encodeURIComponent('U2FsdGVkX1+xygYrkrfI9u+agZ4XNPgHbdFj4RyZRSlBdVFSXXEQ53ul4ZHDv1KFUNEGj5kfdumMR3vkb4bj7xZweR9bXoGORNArSh7ntHs=')+'&pName='+encodeURIComponent('com.synclovis.testnativetrackflowmodule')+'&dId='+encodeURIComponent('Q29vbHBhZCAzNjAwSTU0OkRDOjFEOjgyOkFCOjg0MzYxMw==')+'&platform=ANDROID&type=MOBILE');

      // socket = io('http://localhost:7003/socket.io/web_session?type=WEB_TESTER&deviceType=DESKTOP&osName=WINDOWS&osVersion=10&browserName=CHROME&browserVersion=59.6.0&buildVersion=2.5&apiKey='+ encodeURIComponent('U2FsdGVkX1+xygYrkrfI9u+agZ4XNPgHbdFj4RyZRSlBdVFSXXEQ53ul4ZHDv1KFUNEGj5kfdumMR3vkb4bj7xZweR9bXoGORNArSh7ntHs=')+"&fingerPrint=teyweybuyuyubyugghjjh7484y87yu");

       websocket = io('http://localhost:7003/socket.io?token=$2b$13$h99bq9xWgjKeiz8SsSNoXe2PCMS41jhYxUR8Uq04g3dypu25cINHa&tId=105&type=WEB');
  socket.on('message', handleMessage);
  // socket.on('id', function(id) {
  //   console.log("test 6 rtcclient socket id ",id,localStream);
  //   localId = id;
  // });

  let testSessionPayload = null;
  websocket.on('connection',(connectionInfo )=>{
    console.log('checking here',connectionInfo);
    if(connectionInfo.data.testSessionStatus == 'RUNNING'){
      testSessionPayload = {
        logTrackId:connectionInfo.data._id,
        testerName:connectionInfo.data.testerName,
      };
      websocket.emit("notifyStreaminIsReady",{logTrackId:connectionInfo.data._id,testSessionStatus:connectionInfo.data.testSessionStatus,testerName:connectionInfo.data.testerName.trim()});

    }
    });
  socket.on('streamlink',shareStreamlink=>{
    // localId = shareStreamlink.stream;
    console.log('streamlink for trackflow ====>',shareStreamlink.stream);
    websocket.emit('remoteStreamingTestSession',{url:"http://localhost:3000/"+shareStreamlink.stream});
  });

  socket.on('message', handleMessage=>{
    console.log('handlermessages',handleMessage);
  });
  socket.on('id', function(id) {
    console.log("test 6 rtcclient socket id ",id,localStream);
    localId = id
  });

  function addPeer(remoteId) {
    var peer = new Peer(config.peerConnectionConfig, config.peerConnectionConstraints);
    peer.pc.onicecandidate = function(event) {
      if (event.candidate) {
        send('candidate', remoteId, {
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      }
    };
    peer.pc.onaddstream = function(event) {
      attachMediaStream(peer.remoteVideoEl, event.stream);
      remoteVideosContainer.appendChild(peer.remoteVideoEl);
    };
    peer.pc.onremovestream = function(event) {
      peer.remoteVideoEl.src = '';
      remoteVideosContainer.removeChild(peer.remoteVideoEl);
    };
    peer.pc.oniceconnectionstatechange = function(event) {
      switch(
      (  event.srcElement // Chrome
      || event.target   ) // Firefox
      .iceConnectionState) {
        case 'disconnected':
          remoteVideosContainer.removeChild(peer.remoteVideoEl);
          break;
      }
    };
    peerDatabase[remoteId] = peer;

    return peer;
  }
  function answer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createAnswer(
      function(sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('answer', remoteId, sessionDescription);
      },
      error
    );
  }
  function offer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createOffer(
      function(sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('offer', remoteId, sessionDescription);
      },
      error
    );
  }
  function handleMessage(message) {
    var type = message.type,
        from = message.from,
        pc = (peerDatabase[from] || addPeer(from)).pc;

    console.log('received ' + type + ' from ' + from);

    switch (type) {
      case 'init':
        toggleLocalStream(pc);
        offer(from);
        break;
      case 'offer':
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function(){}, error);
        answer(from);
        break;
      case 'answer':
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function(){}, error);
        break;
      case 'candidate':
        if(pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: message.payload.label,
            sdpMid: message.payload.id,
            candidate: message.payload.candidate
          }), function(){}, error);
        }
        break;
    }
  }
  function send(type, to, payload) {
    console.log('sending ' + type + ' to ' + to);

    socket.emit('message', {
      to: to,
      type: type,
      payload: payload
    });
  }
  function toggleLocalStream(pc) {
    if(localStream) {
      (!!pc.getLocalStreams().length) ? pc.removeStream(localStream) : pc.addStream(localStream);
    }
  }
  function error(err){
    console.log(err);
  }

  return {
    getId:  function() {
      // return localId;
      // let localId = null
      //  socket.on('streamlink',(data)=>{
      //   console.log('streamlink ====>',data);
      //   localId = data.stream;
      // });
       console.log('localId',localId+testSessionPayload.logTrackId)
      return localId+testSessionPayload.logTrackId;
    },

    setLocalStream: function(stream) {

      // if local cam has been stopped, remove it from all outgoing streams.
      if(!stream) {
        for(id in peerDatabase) {
          pc = peerDatabase[id].pc;
          if(!!pc.getLocalStreams().length) {
            pc.removeStream(localStream);
            offer(id);
          }
        }
      }

      localStream = stream;
    },

    toggleLocalStream: function(remoteId) {
      console.log('toggle Local Stream =====>',remoteId);
      peer = peerDatabase[remoteId] || addPeer(remoteId);
      toggleLocalStream(peer.pc);
    },

    peerInit: function(remoteId) {
      console.log('peer init =====>',remoteId);
      peer = peerDatabase[remoteId] || addPeer(remoteId);
      send('init', remoteId, null);
    },

    peerRenegociate: function(remoteId) {
      console.log('peer Renegociate ====>',remoteId);
      offer(remoteId);
    },

    send: function(type, payload) {
      console.log('send =======>',type,payload);
      console.log("payload",testSessionPayload);
      socket.emit(type, testSessionPayload);
    }
  };

});

var Peer = function (pcConfig, pcConstraints) {
  this.pc = new RTCPeerConnection(pcConfig, pcConstraints);
  this.remoteVideoEl = document.createElement('video');
  this.remoteVideoEl.muted = true;
  this.remoteVideoEl.controls = true;
  this.remoteVideoEl.autoplay = true;
};
