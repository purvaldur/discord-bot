var Discord = require("discord.js");
var https = require("https");
var underscore = require('underscore');
var lol = require('lolapi')('3fd9c519-a5b1-426f-a382-e423adf59393', 'euw');

var mybot = new Discord.Client();
var user;
var status;
var overwatch_data;
var gamemessage = "";

mybot.on("ready", function() {
	console.log(`Ready to begin! Serving in ${mybot.channels.length} channels`);
});

mybot.on("message", function(message) {
  if(message.content === "!ping") {
    mybot.sendMessage(message, "pong");
    console.log("pong-ed " + message.author.username);
  }
	if(message.content === "!game") {
		if (message.author.game != null) {
			mybot.sendMessage(message, "You're playing: " + message.author.game.name);
			console.log(message.author.username + " is playing " + message.author.game.name);
		} else {
			mybot.sendMessage(message, "You don't seem to be ingame in anything");
		}
	}
	if(message.content == "( ͡° ͜ʖ ͡°)") { //test
		console.log("event")
    mybot.sendMessage(message, "https://i.imgur.com/ykT87Vc.jpg"); //\u0296
  }
	if(message.content.indexOf("!overwatch ") != -1) {
		var user = message.content.replace("!overwatch ", "");
		if (/^\w+-\w+$/.test(user)) {
			mybot.sendMessage(message, `Fetching data for ${user}...`);
			var options = {
	  		host: "api.lootbox.eu",
	  		path: `/pc/eu/${user}/profile`,
	  		method: "GET",
			};
			https.get(options, function(response) {
				status = response.statusCode;
    		response.on("data", function(chunk) {
      		var overwatch_data = JSON.parse(chunk);
					mybot.sendMessage(message, `Username: ${overwatch_data.data.username}\nLevel: ${overwatch_data.data.level}\nWin percentage: ${overwatch_data.data.games.win_percentage}\nWins: ${overwatch_data.data.games.wins}\nLosses: ${overwatch_data.data.games.lost}\nGames played: ${overwatch_data.data.games.played}\nPlaytime: ${overwatch_data.data.playtime}\n`);
    		});
			});
		} else {
			mybot.sendMessage(message, "You should type the query like this: user-1234. Remember that the query is CASE SENSITIVE.");
		}
	}
	if(message.content.indexOf("!lolgame ") != -1) { //if the part "!lolgame " is part of the sentence
		var summoner_name = message.content.replace("!lolgame ", ""); //remove the part "!lolgame " leaving us with only the username
		var summoner_name_encode = encodeURI(summoner_name); //encodeURI the username to take into account special characters in names such as á
		lol.Summoner.getByName(summoner_name_encode, function (err, res) { //do a lookup on the summoner name
			if (!err) { //if no error
			  summoner_id = res[Object.keys(res)[0]].id; //extract the ID from the data of the response.

			  lol.CurrentGame.getBySummonerId(summoner_id, function (err, res) { //Find this summoners current game by searching for his/her summoner name
			    if (!err) { //if no error
						var summoner_id_list = ""; //set this var up for use later
						Object.keys(res.participants).forEach(function(key) { //for each participant in the match
			         summoner_id = res.participants[key].summonerId; //extract the participant's summoner id
			         summoner_id_list += summoner_id + ","; //Put the summoner ID into a string and seperate by a comma
			      })
			      summoner_id_list = summoner_id_list.substring(0, summoner_id_list.length - 1) //remove the very last character (a comma)

			      lol.Static.getChampions({dataById: true}, function(err, champ_res) { //get all the champoions in the game for use later
							lol.League.getEntriesBySummonerId([summoner_id_list], function(err, ranked_res) { //get ranked data about each participant by searching for their summoner id with the list we created earlier
							  gamemessage = "```\n"; //Begin the game message to be printed
							  gamemessage += "|--------------------|--------------------|--------------------|\n|Summoner Name       |Champion            |Season 6 rank       |\n|--------------------|--------------------|--------------------|\n"; //set up the first 3 lines
							  //team 1
							  var filter = underscore.where(res.participants, {teamId: 100}); //get all the participants in team one
							  var champ_id = '{"id_list": ['; //prep another ID list, this time as a JSON
							  Object.keys(filter).forEach(function(key) {
							    champ_id += filter[key].championId + ",";
							  });
							  champ_id = champ_id.substring(0, champ_id.length - 1);
							  champ_id += "]}";
							  champ_id = JSON.parse(champ_id); //turn the string into a JSON object for manipulation later
							  var champ_name = ""; //prep these two var's for use later
							  var champ_name_list = "";
							  Object.keys(filter).forEach(function(key) { //for each participant in team one
							    var name_string = JSON.stringify(filter[key].summonerName); //put the summoner name into a string
							    name_string = name_string.substring(1).substring(0, name_string.length - 2); //remove the "" characters that result from the .stringify method
							    while (name_string.length < 20) {
							      name_string += " "; //add empty spaces until the namestring is 20 chars long
							    }
							    var search = champ_id.id_list[key]; //Isolate a played champion in the JSON
							    champ_name = JSON.stringify(champ_res.data[search].name) //turn the name of the champ into a string
							    champ_name = champ_name.substring(1).substring(0, champ_name.length - 2); //remove "" characters
									while (champ_name.length < 20) {
										champ_name += " "; //add empty spaces
									}
						      summoner_id = filter[key].summonerId; //get summoner id (again)
					        var ranked_filter = ranked_res[summoner_id]; //get the ranked data for the summoner in question
									ranked_filter = underscore.where(ranked_filter, {queue: "RANKED_SOLO_5x5"}); //find his/her rank in solo 5v5.
					        ranked_filter = JSON.stringify(ranked_filter).replace(/\[/g, "").replace(/\]/g, ""); //put into a string and remove "" characters
									try {
					        	ranked_filter = JSON.parse(ranked_filter); //parse back into a JSON object because node is stupid
						        rank = (JSON.stringify(ranked_filter.tier).replace(/\"/g, "") + ": " + JSON.stringify(ranked_filter.entries.division).replace(/\"/g, "")); //once again back into a string because node is really stupid, and remove "" characters, this time using another method
									} catch(err) {
										rank = "Unranked" //if it cannot parse the rank string as a JSON object, it means the player is unranked
									}
									while (rank.length < 20) {
										rank += " "; //add empty spaces
									}
							    gamemessage += "|" + name_string + "|" + champ_name + "|" + rank + "|" + "\n"; //add all the data we've just handled to the game message, seperated by | characters
							  });
							  gamemessage += "|--------------------|--------------------|--------------------|\n" //end of game message (for team one)
							  //team 2. ALl below is the same as team 1, just with team 2 instead.
							  filter = underscore.where(res.participants, {teamId: 200});
							  var champ_id = '{"id_list": [';
							  Object.keys(filter).forEach(function(key) {
							    champ_id += filter[key].championId + ",";
							  });
							  champ_id = champ_id.substring(0, champ_id.length - 1);
							  champ_id += "]}";
							  champ_id = JSON.parse(champ_id);
							  Object.keys(filter).forEach(function(key) {
									var name_string = JSON.stringify(filter[key].summonerName);
							    name_string = name_string.substring(1).substring(0, name_string.length - 2);
							    while (name_string.length < 20) {
							      name_string += " ";
							    }
							    var search = champ_id.id_list[key];
							    champ_name = JSON.stringify(champ_res.data[search].name)
							    champ_name = champ_name.substring(1).substring(0, champ_name.length - 2);
									while (champ_name.length < 20) {
										champ_name += " ";
									}
						      summoner_id = filter[key].summonerId;
					        var ranked_filter = ranked_res[summoner_id];
									ranked_filter = underscore.where(ranked_filter, {queue: "RANKED_SOLO_5x5"});
					        ranked_filter = JSON.stringify(ranked_filter).replace(/\[/g, "").replace(/\]/g, "");
									try {
					        	ranked_filter = JSON.parse(ranked_filter);
						        rank = (JSON.stringify(ranked_filter.tier).replace(/\"/g, "") + ": " + JSON.stringify(ranked_filter.entries.division).replace(/\"/g, ""));
									} catch(err) {
										rank = "Unranked"
									}
									while (rank.length < 20) {
										rank += " ";
									}
							    gamemessage += "|" + name_string + "|" + champ_name + "|" + rank + "|" + "\n";
							  });
							  gamemessage += "|--------------------|--------------------|--------------------|\n"
							  gamemessage += "```"
							  mybot.sendMessage(message, gamemessage); //send the message
							});
				  	});
			    } else {mybot.sendMessage(message, "Current game lookup error: " + err + " (if you're unsure what this means, ask my creator)")};
			  });
			} else {mybot.sendMessage(message, "Summoner name lookup error: " + err + " (if you're unsure what this means, ask my creator)")};
		});
	}
});

mybot.loginWithToken("MTc0NTM1NzExNjMyOTE2NDgw.Ckal1w.7ShGhOlJXaWta9Tu925gC4Qkh1M");
// If you still need to login with email and password, use mybot.login("email", "password");
