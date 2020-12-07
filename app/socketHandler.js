module.exports = function(io, streams) {
  let socketLogTrackId = null;
  io.on('connection', function(client){
    console.log('-- ' + client.id + ' joined --');
    client.emit('id', client.id);

    client.on('message', function (details) {
      var otherClient = io.sockets.connected[details.to];
      console.log("otheClient from ",otherClient,details)

      if (!otherClient) {
        console.log('here not equal to')
        return;
      }
        delete details.to;
        details.from = client.id;
        console.log('other not equal to')
        otherClient.emit('message', details);
    });

    client.on('readyToStream', function(options) {
      console.log('-- ' + client.id + ' is ready to stream --');

      console.log("--- options details ----",options);
      client.emit("streamlink",{stream:client.id+options.logTrackId});
      socketLogTrackId = options.logTrackId
      streams.addStream(client.id+options.logTrackId, options.testerName);
      console.log('number of streams =====>',streams.getStreams())
    });

    client.on('update', function(options) {
      streams.update(client.id, options.name);
    });

    function leave() {
      console.log('-- ' + client.id + ' left --');
       streams.removeStream('ETiuIAwPnN5uIFbsAAAA105_208_89_73')
      streams.removeStream('0yOIxODWlgnbNy9nAAAA105_208_89_73')

      streams.removeStream(client.id+socketLogTrackId);
    }

    client.on('disconnect', leave);
    client.on('leave', leave);
  });
};
