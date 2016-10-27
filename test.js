var token = require('./tokens.js');
var PlayMusic = require('playmusic');
var pm = new PlayMusic();

console.log(android_id);
pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
    pm.search("daft punk", 5, function(err, res) {
        var gSong = res.entries.filter(function(data) { return data.type == 1 }).shift();
        console.log(gSong);
    });
});

//things = JSON.parse(`{ "author": "110406708299329536", "playlist": {} }`);
//things.playlist["track"] = "123";
//things = JSON.stringify(things)
////things.playlist.push('"track": "123"');
//console.log(things);
