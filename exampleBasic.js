const express = require('express');
const { ifError } = require('assert');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const newG = require('./globby').newIOServer;
const delayStartBlocker = require('./blockers').delayStartBlocker


app.use('/static', express.static('public'))

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
  
      // swap elements array[i] and array[j]
      // we use "destructuring assignment" syntax to achieve that
      // you'll find more details about that syntax in later chapters
      // same can be written as:
      // let t = array[i]; array[i] = array[j]; array[j] = t
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

function drawCard(playerHand,deck){
    if(deck.length){
        const el = deck[deck.length-1];
        deck.length -=1;
        playerHand.push(el);
    }
}


function playCard(player,state,card){
    let firstCard;
    if(state.board.player1Card && !state.board.player2Card){
        firstCard = state.board.player1Card;
    }
    else if (!state.board.player1Card && state.board.player2Card){
        firstCard = state.board.player2Card;
    }
    

    if(player.ref == 'player1' && state.turn == 'player1'){
        state.board.player1Card = state.player1Hand[card];
        state.player1Hand.splice(card,1)
        state.turn = 'player2'
    }
    else if(player.ref == 'player2' && state.turn == 'player2'){
        state.board.player2Card = state.player2Hand[card];
        state.player2Hand.splice(card,1)
        state.turn = 'player1'
    }
    if(state.board.player1Card && state.board.player2Card){
        calculateBoard(state,firstCard);
        winCheck(state);
    }
}


function calculateBoard(state,firstCard){
    if(state.board.player1Card && state.board.player2Card){

        if(state.board.player1Card.type == state.dominantType || state.board.player2Card.type == state.dominantType){
            if(state.board.player1Card.type != state.dominantType){
                playerTakes(state,'player1')
            }
            else if(state.board.player2Card.type != state.dominantType){
                playerTakes(state,'player2')
            }
            else{
                if(state.board.player1Card.power > state.board.player2Card.power){
                    playerTakes(state,'player1')
                }
                else{
                    playerTakes(state,'player2')
                }
            }
        }
        else if(state.board.player1Card == firstCard){
            if(state.board.player1Card.type == state.board.player2Card.type){
                if(state.board.player1Card.power > state.board.player2Card.power){
                    playerTakes(state,'player1');
                }
                else{
                    playerTakes(state,'player2');
                }
            }
            else{
                playerTakes(state,'player1')
            }
        }
        else if(state.board.player2Card == firstCard){
            if(state.board.player1Card.type == state.board.player2Card.type){
                if(state.board.player1Card.power < state.board.player2Card.power){
                    playerTakes(state,'player2');
                }
                else{
                    playerTakes(state,'player1');
                }
            }
            else{
                playerTakes(state,'player2')
            }
        }

        drawCard(state['player1Hand'],state.deck);
        drawCard(state['player2Hand'],state.deck);
    }
}

function playerTakes(state,player){
    if(player == 'player1'){
        state.player1Graveyard.push(state.board.player1Card);
        state.player1Graveyard.push(state.board.player2Card);
        state.turn = 'player1';
    }
    else{
        state.player2Graveyard.push(state.board.player1Card);
        state.player2Graveyard.push(state.board.player2Card);
        state.turn = 'player2'
    }
    state.board = {
        player1Card: undefined,
        player2Card: undefined
    }
}

function winCheck(state){
    let pl1Res;
    let pl2Res;
    if(state.player1Graveyard.length == 0){
        pl1Res = 0;
    }
    else{
        pl1Res = state.player1Graveyard.reduce((prev,curr) => {
            return prev +curr.points;
        })
    }

    if(state.player2Graveyard.length == 0){
        pl2Res = 0;
    }else{
        pl2Res  = state.player2Graveyard.reduce((prev, curr) => {
            return prev  + curr.points;
        })
    }



    if(pl1Res >= 66){
        resetBoard();
        if(pl2Res < 33){
            state.gamesWon1 += 2;
        }
        else if(state.player2Graveyard.length == 0){
            state.gamesWon1 += 3;
        }
        else{
            state.gamesWon1 += 1;
        }

        resetBoard()
    }


    if(pl2Res >= 66){
        if(pl1Res < 33){
            state.gamesWon2 += 2;
        }
        else if(state.player1Graveyard.length == 0){
            state.gamesWon2 += 3;
        }
        else{
            state.gamesWon2 += 1;
        }
        resetBoard();
    }

}

function  resetBoard(state){
    state.deck= [];
    state.board = {
        player1Card:undefined,
        player2Card:undefined
    }
    state.player1Hand =[];
    state.player2Hand =[];
    state.player1Graveyard = [];
    state.player2Graveyard = [];
    state.turn = 'player1';
    state.dominantType =1;
    once =false;
    closedDeck = undefined;

    startGame();
}

function fillDeck(state){
        state.deck = [
        {power: 0, type:1, points:0},
        {power: 1, type:1, points:2},
        {power: 2, type:1, points:3},
        {power: 3, type:1, points:4},
        {power: 4, type:1, points:10},
        {power: 5, type:1, points:11},
        
        
        {power: 0, type:2, points:0},
        {power: 1, type:2, points:2},
        {power: 2, type:2, points:3},
        {power: 3, type:2, points:4},
        {power: 4, type:2, points:10},
        {power: 5, type:2, points:11},
        
        
        {power: 0, type:3, points:0},
        {power: 1, type:3, points:2},
        {power: 2, type:3, points:3},
        {power: 3, type:3, points:4},
        {power: 4, type:3, points:10},
        {power: 5, type:3, points:11},
        
        
        
        {power: 0, type:4, points:0},
        {power: 1, type:4, points:2},
        {power: 2, type:4, points:3},
        {power: 3, type:4, points:4},
        {power: 4, type:4, points:10},
        {power: 5, type:4, points:11}]

        shuffle(state.deck);
}

function startGame(state){
    fillDeck(state);
    state.once = true;
    for(let i = 0; i<6; i++){
        drawCard(state['player1Hand'],state.deck);
        drawCard(state['player2Hand'],state.deck);
    }
}



newG({
    baseState: {
        deck: [],
        board: {
            player1Card:undefined,
            player2Card:undefined
        },
        player1Hand:[],
        player2Hand:[],
        player1Graveyard:[],
        player2Graveyard:[],
        turn: 'player1',
        dominantType:1,
        once:false,

        closedDeck:undefined,
        gamesWon1:0,
        gamesWon2:0
    },
    moveFunction: function (player, move, state) {
        playCard(player,state,move);
    },
    timeFunction: function(state){
        if(state.once == false){
            startGame(state);
            state.once = true;
        }
    },
    maxPlayers:2,
    startBlockerFunction: delayStartBlocker.startBlockerFunction(1000),
    joinBlockerFunction: delayStartBlocker.joinBlockerFunction,
    statePresenter: function (state, playerRef) {

        if(playerRef == 'player1'){
            return {
                board:state.board,
                playerHand:state.player1Hand
            }
        }
        else if(playerRef == 'player2'){
            return {
                board:state.board,
                playerHand:state.player2Hand
            }
        }
        
        return state;
    },
    connectFunction: function (state, playerRef) {
        
    },
    disconnectFunction: function (state, playerRef) {
        state[playerRef] = undefined;
    }
},
    io)


app.get('/', function (req, res) {
    return res.status(200).sendFile(__dirname + '/exampleBasic.html');
});


http.listen(3005, function () {
    console.log('listening on *:3000');
});