var Discord = require("discord.js");
var token = require('./tokens.js');
var streams = require('./streams.js');
var request = require('request')
var underscore = require('underscore');
var icecast = require('icecast');
var PlayMusic = require('playmusic');
var fs = require('fs');

var mybot = new Discord.Client();
var pm = new PlayMusic();
var voice_channel;
var stationlist_string;
var dispatcher = [];
var icecast_parsed;
var icecast_string;
var radio;
var radio_playing = false;

var gQueue = [];
var playlist_file = 'user_playlists.json';

function radiolist() {
    stationlist_string = "";
    underscore.each(streams.streamlist, function(value, key) {
        stationlist_string += key.toString() + "\n";
    })
}
function play(serverId, channel) {
    if (gQueue.length != 0) {
        pm.getStreamUrl(gQueue[0], function(err, streamUrl) {
            dispatcher[serverId] = mybot.voiceConnections.get(serverId).playStream(request(streamUrl), {seek:0, volume:0.1});
            channel.sendMessage("Currently playing: **fetching this not yet implemented**");
            dispatcher[serverId].on('end', function() {
                gQueue.shift();
                if (gQueue.length != 0) {
                    play(serverId, channel);
                } else {
                    channel.sendMessage("No more songs left in queue");
                }
            });
        });
    } else {
        channel.sendMessage("No more songs left in queue");
    }
}
//function playlistadd(song, author) {
//    pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
//        pm.search(song, 5, function(err, res) {
//            song = res.entries.filter(function(data) { return data.type == 1 }).shift();
//            author = `{ "${}" }`
//            song = `{ "track": "${song.track.nid}" }\n`;
//            fs.appendFile(playlist_file, song, function(err) {
//                console.log("error: " + err);
//            })
//        });
//    });
//}

mybot.on("ready", function() {
    console.log("Ready to begin! Serving in " + mybot.guilds.size + " channels");
});

mybot.on("message", function(message) {
    if(message.content === "!ping") {
        message.channel.sendMessage("pong");
        console.log("pong-ed " + message.author.username);
    }
    if(message.content === "!join") {
        voice_channel = message.member.voiceChannel;
        if (voice_channel == undefined) {
            message.channel.sendMessage("Error! (are you not in a voice channel?)")
        } else {
            message.channel.sendMessage('Joining channel named "' + voice_channel.name + '"')
            voice_channel.join()
        }
    }
    if(message.content === "!leave") {
        voice_channel = message.member.voiceChannel;
        if (voice_channel == undefined) {
            message.channel.sendMessage("Error! (are you not in a voice channel?)")
        } else {
            message.channel.sendMessage('Leaving channel named "' + voice_channel.name + '"')
            voice_channel.leave()
            mybot.user.setStatus("Online", "");
            radio_playing = false;
        }
    }
    if(message.content.startsWith("!radio ") && message.content !== "!radio info" && message.content !== "!radio list") {
        voice_channel = message.member.voiceChannel;
        var radio_string = message.content.replace("!radio ", "");
        radio = streams.streamlist[radio_string];
        if (radio !== undefined) {
            if (!voice_channel || voice_channel.type !== 'voice') {
                message.channel.sendMessage("Error! (are you not in a voice channel?)");
            } else {
                if (mybot.voiceConnections.get(message.guild.id) && mybot.voiceConnections.get(message.guild.id).channel.id == voice_channel.id) {
                    radio_playing = true;
                    dispatcher = mybot.voiceConnections.get(message.guild.id).playStream(request(radio), {seek:0, volume:0.1});
                    icecast.get(radio, function (response) {
                        response.on('metadata', function (metadata) {
                            icecast_parsed = icecast.parse(metadata);
                            icecast_string = icecast_parsed.StreamTitle.toString().replace("Senest spillet: ", "");
                            if (icecast_string) {
                                message.channel.sendMessage("**Currently playing:** " + icecast_string);
                            } else {
                                message.channel.sendMessage("**Currently playing:** *unable to retrieve info*");
                            }
                        });
                    });
                    mybot.user.setStatus("Online", "funky tunes!");
                } else {
                    message.channel.sendMessage("Error! (are you not in the same voice channel as I am?)");
                }
            }
        } else {
            message.channel.sendMessage("Error! (That radio station does not exist in my database)\nThe following is a list of the currently available stations:\n\n");
            radiolist();
            message.channel.sendMessage(stationlist_string);
        }
    }
    if (message.content === "!radio info") {
        if (radio_playing == true) {
            icecast.get(radio, function (response) {
                response.on('metadata', function (metadata) {
                    icecast_parsed = icecast.parse(metadata);
                    icecast_string = icecast_parsed.StreamTitle.toString().replace("Senest spillet: ", "");
                    if (icecast_string) {
                        message.channel.sendMessage("**Currently playing:** " + icecast_string);
                    } else {
                        message.channel.sendMessage("**Currently playing:** *unable to retrieve info*");
                    }
                });
            });
        } else {
            message.channel.sendMessage("Error! (I'm not playing anything right now, am I?)");
        }
    }
    if (message.content === "!radio list") {
        message.channel.sendMessage("The following is a list of the currently available stations:\n\n");
        radiolist();
        message.channel.sendMessage(stationlist_string);
    }
    if (message.content.startsWith("!songsearch ")) {
        var songsearch_string = message.content.replace("!songsearch ", "");
        if (!voice_channel || voice_channel.type !== 'voice') {
            message.channel.sendMessage("Error! (are you not in a voice channel?)");
        } else {
            if (mybot.voiceConnections.get(message.guild.id) && mybot.voiceConnections.get(message.guild.id).channel.id == voice_channel.id) {
                pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
                    pm.search(songsearch_string, 5, function(err, res) {
                        var gSong = res.entries.filter(function(data) { return data.type == 1 }).shift();
                        if (gQueue.length != 0) {
                            if (gQueue[0] == "placeholder") {
                                gQueue.shift();
                            }
                            gQueue.push(gSong.track.nid);
                            var queuelength = gQueue.length - 1;
                            message.channel.sendMessage("Song has been queued. It is currently number " + queuelength + " in the queue");
                        } else {
                            gQueue.push(gSong.track.nid);
                            play(message.guild.id, message.channel);
                            mybot.user.setStatus("Online", "funky tunes!");
                        }
                    });
                });
            } else {
                message.channel.sendMessage("Error! (are you not in the same voice channel as I am?)");
            }
        }
    }
    if (message.content === "!skip") {
        message.channel.sendMessage("Skipping song...");
        dispatcher[message.guild.id].end();
    }
//    if (message.content.startsWith("!gmusic playlist add ")) {
//        playlistadd(message.content.replace("!gmusic playlist add ", ""), message.author.id);
//        console.log();
//    }
});

mybot.login(bot_token);
process.on("uncaughtException", (error) => { if(error.code === "ECONNRESET") return; });

//Remember to add local file containing keys and tokens (tokens.js)!!!
