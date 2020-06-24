const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const newG = require('./globby').newIOServer;


app.use('/static', express.static('public'))

newG({
  baseState: {
    //Starting State
    test: 5
  },
  outerReference:{
    proba:5
  },
  moveFunction: function (player, move, state,outerReference) {
    //State Change on Move
    state[player.ref].x += 25;
  },
  maxPlayers: 3, // Number of Players you want in a single game
  timeFunction: function (state) {
    state.test += 5;
    //State Change on every frame
  },
  // startBlockerFunction: delayStartBlocker.startBlockerFunction(1000),
  // joinBlockerFunction: delayStartBlocker.joinBlockerFunction,
  statePresenter: function (state, playerRef,outerReference) {

    return state;
  },
  connectFunction: function (state, playerRef,outerReference) {
    state[playerRef] = {
      x: 50,
      y: 50
    }
  },
  disconnectFunction: function (state, playerRef,outerReference) {
    state[playerRef] = undefined;
  }
},

  io)


app.get('/', function (req, res) {
  return res.status(200).sendFile(__dirname + '/index.html');
});


http.listen(3005, function () {
  console.log('listening on *:3000');
});