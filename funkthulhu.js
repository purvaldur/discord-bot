var Discord = require("discord.js");
var token = require('./tokens.js');
var streams = require('./streams.js');
var request = require('request')
var underscore = require('underscore');
var icecast = require('icecast');

var mybot = new Discord.Client();
var voice_channel;
var stationlist_string;
var dispatcher;
var icecast_parsed;
var icecast_string;
var radio;
var radio_playing = false;

function radiolist() {
    stationlist_string = "";
    underscore.each(streams.streamlist, function(value, key) {
        stationlist_string += key.toString() + "\n";
    })
}

mybot.on("ready", function() {
	console.log("Ready to begin! Serving in " + mybot.channels.size + " channels");
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
	if(message.content.indexOf("!radio ") != -1 && message.content !== "!radio info" && message.content !== "!radio list") {
	    voice_channel = message.member.voiceChannel;
		var radio_string = message.content.replace("!radio ", "");
		radio = streams.streamlist[radio_string];
		if (radio !== undefined) {
			if (!voice_channel || voice_channel.type !== 'voice') {
				message.channel.sendMessage("Error! (are you not in a voice channel?)");
			} else {
				if (mybot.voiceConnections.get(message.guild.id) && mybot.voiceConnections.get(message.guild.id).channel.id == voice_channel.id) {
                    radio_playing = true;
					dispatcher = mybot.voiceConnections.get(message.guild.id).playStream(request(radio));
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

	if (message.content === "!restart") {
		console.log("Restarting the script...");
		process.exit(1);
	}
});
mybot.login(bot_token);

//Remember to add local file containing keys and tokens (tokens.js)!!!
