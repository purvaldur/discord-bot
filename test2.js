var token = require('./tokens.js');
var PlayMusic = require('playmusic');

var pm = new PlayMusic();
var gQueue = [];

pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
    pm.search("daft punk get lucky", 5, function(err, res) {
        var gSong = res.entries.filter(function(data) { return data.type == 1 }).shift();
        gQueue.push(gSong.track.nid);
        console.log(gQueue);
    });
});
