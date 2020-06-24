const newGame = function (properties) {
    let baseState = properties.baseState || {};

    const timeFunction = properties.timeFunction || function (state,outerReference) { };
    const moveFunction = properties.moveFunction || function (staplayer, move, state,outerReference) { };
    const maxPlayers = properties.maxPlayers || 2;
    const minPlayers = properties.minPlayers || maxPlayers;
    const statePresenter = properties.statePresenter || function (copyState, playerRef,outerReference) {
        return copyState
    }

    const connectFunction = properties.connectFunction || function (state, playerRef,outerReference) {

    }

    const disconnectFunction = properties.disconnectFunction || function (state, playerRef,outerReference) {

    }

    const outerReference = properties.outerReference || {};

    const startBlockerFunction = properties.startBlockerFunction || function (minPlayers, maxPlayers, currentPlayers, state) {
        /* 
            Return Undefined to start game and an object to block
        */
        if (minPlayers == maxPlayers) {
            //Nqma custom minPlayers ot suzdatelq
            if (state.started) {
                return;
            }
            else if (!state.started && currentPlayers.length == maxPlayers) {
                state.started = true;
            }
            else {
                return { message: "Not Enough Players To Start", required: minPlayers, current: currentPlayers.length }; // Return object while you want users to join the same room
            }
        }
        else {
            if (currentPlayers.length < minPlayers && !state.started) {
                return { message: "Not Enough Players To Start", required: minPlayers, current: currentPlayers.length }; // Return object while you want users to join the same room
            }
            else {
                state.started = true;
                return;// Return undefined when you want the user to join new game
            }
        }
    }

    const allowJoinFunction = properties.joinBlockerFunction || function (minPlayers, maxPlayers, currentPlayers, state) {
        /*
        Return true if you want the user to join the same room AND false to return a new room
        */
        if (minPlayers == maxPlayers) {
            //Nqma custom minPlayers ot suzdatelq
            if (!state.started) {
                return true // Return true if you want users to join the same room
            }
            else {
                return false //Return false if you want a new room to be open for the user
            }
        }
        else {
            if (currentPlayers.length < maxPlayers) {
                return true;// Return false when you want the user to join a new game
            }
            else {
                return false;
            }
        }
    }

    const lobby = function () {
        this.games = [];


        this.gamesNum = function () {
            return games.length
        }

        this.disconnectGame = function (socketId, playerId) {
            const game = this.games.find((game) => {
                let isThisIt = false;

                game.players.forEach((player) => {
                    if (player.socketId == socketId || player.hello == playerId) {
                        isThisIt = true;
                    }
                })
                return isThisIt;
            })

            if (game) {
                game.disconnect(socketId)
                if (!game.players.length) {
                    this.games.splice(this.games.indexOf(game), 1)
                }
            }
        }

        this.joinGame = function (socketId, playerId) {
            let ga = this.games.find((g) => {

                if (playerId) {
                    return g.players.find((player) => {
                        if (player.hello == playerId && player.socketId != socketId) {
                            player.socketId = socketId
                        }
                        return player.hello == playerId
                    })
                }

                return g.players.find((player) => {
                    return player.socketId == socketId
                })
            })

            if (!ga) {
                ga = this.games.find((g) => {
                    let st = g.returnState(playerId);
                    return allowJoinFunction(minPlayers, maxPlayers, g.players, st)
                })

                if (ga) {
                    ga.join(socketId, playerId);
                }
            }

            if (!ga) {
                ga = new g();
                this.games.push(ga)
                ga.join(socketId, playerId)
            }

            if (playerId) {
                return ga.returnState(playerId);
            }

            return ga.returnState(socketId);
        }



        this.move = function (socketId, move) {
            let ga = this.games.find((g) => {
                return g.players.find((player) => {
                    return player.socketId == socketId;
                })
            })
            if (!ga) {
                return
            }
            ga.move(socketId, move);
        }
    }

    function g() {

        let state = JSON.parse(JSON.stringify(baseState));
        state.playersConfigArray = this.players;
        this.players = [];
        this.disconnected = [];

        this.move = (socketId, move) => {
            let player = state.playersConfigArray.find((pl) => {
                return pl.socketId == socketId
            })

            const blocker = startBlockerFunction(minPlayers, maxPlayers, state.playersConfigArray, state)

            if (blocker != undefined) {
                return blocker;
            }

            moveFunction(player, move, state,outerReference)
        }

        this.timeFunction = () => {

            const blocker = startBlockerFunction(minPlayers, maxPlayers, state.playersConfigArray, state)
            if (blocker != undefined) {
                return blocker;
            }

            if (timeFunction != undefined) {
                timeFunction(state,outerReference)
            }
        }

        this.returnState = (socketId) => {

            const blocker = startBlockerFunction(minPlayers, maxPlayers, state.playersConfigArray, state)
            if (blocker != undefined) {
                return blocker;
            }

            let copyState = JSON.parse(JSON.stringify(state));
            const player = state.playersConfigArray.find((pl) => {
                return pl.socketId == socketId
            })
            if (player) {
                copyState = statePresenter(copyState, player.ref,outerReference)
            }
            return copyState
        }

        this.join = (socketId, playerId) => {
            const player = { socketId: socketId, ref: 'player' + (this.players.length + 1 + this.disconnected.length) }
            if (playerId) {
                player.hello = playerId;
                const existing = this.disconnected.find((pl) => {
                    return pl.hello == player.hello
                })
                if (existing) {
                    existing.socketId = socketId
                    this.players.push(existing);
                    this.disconnected.splice(this.disconnected.indexOf(existing), 1);
                }
                else {
                    this.players.push(player)
                }
            }
            else {
                this.players.push(player);
            }
            state.playersConfigArray = this.players;

            connectFunction(state, player.ref,outerReference)

        }

        this.disconnect = (socketId) => {
            let pl = this.players.find((pl) => {
                return pl.socketId == socketId;
            })

            if (!pl) {
                return;
            }
            if (!pl.hello) {
                this.players.splice(this.players.indexOf(pl), 1);
            }
            else {
                this.disconnected.push(this.players[this.players.indexOf(pl)])
                this.players.splice(this.players.indexOf(pl), 1);
            }

            disconnectFunction(state, pl.ref,outerReference)
        }
    }

    return lobby

}


module.exports.newGame = newGame;


module.exports.newIOServer = function newServer(properties, io, hello) {
    let g = newGame(properties);
    const frameRate = properties.delay || 100;
    const lobby = new g();


    const helperFunctionDelay = function () {
        setTimeout(() => {
            lobby.games.forEach((game) => {
                if (!game.players.length) {
                    lobby.games.splice(lobby.games.indexOf(game), 1)
                }
                else {
                    game.timeFunction();
                    game.players.forEach((player) => {
                        if (!hello) {
                            io.to(player.socketId).emit('returnState', game.returnState(player.socketId)) //First player.socketId is mandatory
                        }
                        else {
                            if (player.hello) {
                                io.to(player.socketId).emit('returnState', game.returnState(player.hello)) //First player.socketId is mandatory
                            }
                        }
                    })
                }
            })
            helperFunctionDelay();
        }, frameRate)
    }
    helperFunctionDelay();

    io.on('connection', function (socket) {

        if (!hello) {
            lobby.joinGame(socket.id)

            socket.on('disconnect', () => {
                lobby.disconnectGame(socket.id)
            })

            socket.on('move', (data) => {
                lobby.move(socket.id, data);
            })
        }
        else {

            socket.on('hello', (data) => {
                socket.hello = data;
                lobby.joinGame(socket.id, data);
            })


            socket.on('disconnect', () => {
                if (socket.hello) {
                    lobby.disconnectGame(socket.id, socket.hello)
                }
            })

            socket.on('move', (data) => {
                if (socket.hello) {
                    lobby.move(socket.id, data);
                }
            })
        }


    });
}