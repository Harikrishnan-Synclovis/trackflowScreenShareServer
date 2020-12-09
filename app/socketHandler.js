module.exports = function(io, streams) {

  io.on('connection', function(client){
    console.log('-- ' + client.id + ' joined --');
    console.log(" test 1 connection from socket");
    client.emit('id', client.id);

    client.on('message', function (details) {
      var otherClient = io.sockets.connected[details.to];

      if (!otherClient) {
        return;
      }
        delete details.to;
        details.from = client.id;
        otherClient.emit('message', details);
    });

    client.on('readyToStream', function(options) {
      console.log('test 4 readytostream socket',options);
      console.log('-- ' + client.id + ' is ready to stream --');
      let testerName = null
      client.on('testDetails',details=>{
        console.log('details= =======>',details);
      })

      streams.addStream(client.id, options.name);
      client.emit("streamlink",{stream:client.id});
      console.log('test 5 addStream socket',streams.getStreams());
    });

    client.on('update', function(options) {
      streams.update(client.id, options.name);
    });

    function leave() {
      console.log('-- ' + client.id + ' left --');
      streams.removeStream(client.id);
    }

    client.on('disconnect', leave);
    client.on('leave', leave);
  });
};
