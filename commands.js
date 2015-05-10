var mafhost = [];
mafhost= fs.readFileSync('data/hostlist.txt').toString().split('\n');

/**
 * This is the file where the bot commands are located
 *
 * @license MIT license
 */

var http = require('http');
var sys = require('sys');

if (config.serverid === 'showdown') {
	var https = require('https');
	var csv = require('csv-parse');
}

exports.commands = {
	/**
	 * Help commands
	 *
	 * These commands are here to provide information about the bot.
	 */

	credits: 'about',
	about: function(arg, by, room) {
		if (this.hasRank(by, '#~') || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		text += '**Pokémon Showdown Bot** by: Quinella, TalkTakesTime, and Morfent';
		this.say(room, text);
	},
	git: function(arg, by, room) {
		var text = config.excepts.indexOf(toId(by)) < 0 ? '/pm ' + by + ', ' : '';
		text += '**Pokemon Showdown Bot** source code: ' + config.fork;
		this.say(room, text);
	},
	help: 'guide',
	guide: function(arg, by, room) {
		if (this.hasRank(by, '#~') || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		if (config.botguide) {
			text += 'Welcome to the (hopefully) new  Mafia Room bot! This bot was created by Smogoon, Rothuit, and TheWhoDoctor. Link to Bot guide: ' + config.botguide;
		} else {
			text += 'There is no guide for this bot. PM the owner with any questions.';
		}
		this.say(room, text);
	},

	
	/**
	 * Dev commands
	 *
	 * These commands are here for highly ranked users (or the creator) to use
	 * to perform arbitrary actions that can't be done through any other commands
	 * or to help with upkeep of the bot.
	 */

	reload: function(arg, by, room) {
		if (!this.hasRank(by, '#~')) return false;
		try {
			this.uncacheTree('./commands.js');
			Commands = require('./commands.js').commands;
			this.say(room, 'Your fuck ups have been fixed.');
		} catch (e) {
			error('you fucked up too badly. rip' + sys.inspect(e));
		}
	},
	custom: function(arg, by, room) {
		if (!this.hasRank(by, '~')) return false;
		// Custom commands can be executed in an arbitrary room using the syntax
		// ".custom [room] command", e.g., to do !data pikachu in the room lobby,
		// the command would be ".custom [lobby] !data pikachu". However, using
		// "[" and "]" in the custom command to be executed can mess this up, so
		// be careful with them.
		if (arg.indexOf('[') === 0 && arg.indexOf(']') > -1) {
			var tarRoom = arg.slice(1, arg.indexOf(']'));
			arg = arg.substr(arg.indexOf(']') + 1).trim();
		}
		this.say(tarRoom || room, arg);
	},
	js: function(arg, by, room) {
		if (config.excepts.indexOf(toId(by)) === -1) return false;
		try {
			var result = eval(arg.trim());
			this.say(room, JSON.stringify(result));
		} catch (e) {
			this.say(room, e.name + ": " + e.message);
		}
	},

	/**
	 * Room Owner commands
	 *
	 * These commands allow room owners to personalise settings for moderation and command use.
	 */

	settings: 'set',
	set: function(arg, by, room) {
		if (!this.hasRank(by, '%@&#~') || room.charAt(0) === ',') return false;

		var settable = {
			say: 1,
			joke: 1,
			choose: 1,
			usagestats: 1,
			buzz: 1,
			'8ball': 1,
			survivor: 1,
			games: 1,
			wifi: 1,
			monotype: 1,
			autoban: 1,
			happy: 1,
			guia: 1,
			studio: 1,
			'switch': 1,
			banword: 1,
			'randomtheme': 1
		};
		var modOpts = {
			flooding: 1,
			caps: 1,
			stretching: 1,
			bannedwords: 1
		};

		var opts = arg.split(',');
		var cmd = toId(opts[0]);
		if (cmd === 'mod' || cmd === 'm' || cmd === 'modding') {
			if (!opts[1] || !toId(opts[1]) || !(toId(opts[1]) in modOpts)) return this.say(room, 'Incorrect command: correct syntax is ' + config.commandcharacter + 'set mod, [' +
				Object.keys(modOpts).join('/') + '](, [on/off])');

			if (!this.settings['modding']) this.settings['modding'] = {};
			if (!this.settings['modding'][room]) this.settings['modding'][room] = {};
			if (opts[2] && toId(opts[2])) {
				if (!this.hasRank(by, '#~')) return false;
				if (!(toId(opts[2]) in {on: 1, off: 1}))  return this.say(room, 'Incorrect command: correct syntax is ' + config.commandcharacter + 'set mod, [' +
					Object.keys(modOpts).join('/') + '](, [on/off])');
				if (toId(opts[2]) === 'off') {
					this.settings['modding'][room][toId(opts[1])] = 0;
				} else {
					delete this.settings['modding'][room][toId(opts[1])];
				}
				this.writeSettings();
				this.say(room, 'Moderation for ' + toId(opts[1]) + ' in this room is now ' + toId(opts[2]).toUpperCase() + '.');
				return;
			} else {
				this.say(room, 'Moderation for ' + toId(opts[1]) + ' in this room is currently ' +
					(this.settings['modding'][room][toId(opts[1])] === 0 ? 'OFF' : 'ON') + '.');
				return;
			}
		} else {
			if (!Commands[cmd]) return this.say(room, config.commandcharacter + '' + opts[0] + ' is not a valid command.');
			var failsafe = 0;
			while (!(cmd in settable)) {
				if (typeof Commands[cmd] === 'string') {
					cmd = Commands[cmd];
				} else if (typeof Commands[cmd] === 'function') {
					if (cmd in settable) {
						break;
					} else {
						this.say(room, 'The settings for ' + config.commandcharacter + '' + opts[0] + ' cannot be changed.');
						return;
					}
				} else {
					this.say(room, 'Something went wrong. PM TalkTakesTime here or on Smogon with the command you tried.');
					return;
				}
				failsafe++;
				if (failsafe > 5) {
					this.say(room, 'The command "' + config.commandcharacter + '' + opts[0] + '" could not be found.');
					return;
				}
			}

			var settingsLevels = {
				off: false,
				disable: false,
				'+': '+',
				'%': '%',
				'@': '@',
				'&': '&',
				'#': '#',
				'~': '~',
				on: true,
				enable: true
			};
			if (!opts[1] || !opts[1].trim()) {
				var msg = '';
				if (!this.settings[cmd] || (!this.settings[cmd][room] && this.settings[cmd][room] !== false)) {
					msg = '' + config.commandcharacter + '' + cmd + ' is available for users of rank ' + ((cmd === 'autoban' || cmd === 'banword') ? '#' : config.defaultrank) + ' and above.';
				} else if (this.settings[cmd][room] in settingsLevels) {
					msg = '' + config.commandcharacter + '' + cmd + ' is available for users of rank ' + this.settings[cmd][room] + ' and above.';
				} else if (this.settings[cmd][room] === true) {
					msg = '' + config.commandcharacter + '' + cmd + ' is available for all users in this room.';
				} else if (this.settings[cmd][room] === false) {
					msg = '' + config.commandcharacter + '' + cmd + ' is not available for use in this room.';
				}
				this.say(room, msg);
				return;
			} else {
				if (!this.hasRank(by, '#~')) return false;
				var newRank = opts[1].trim();
				if (!(newRank in settingsLevels)) return this.say(room, 'Unknown option: "' + newRank + '". Valid settings are: off/disable, +, %, @, &, #, ~, on/enable.');
				if (!this.settings[cmd]) this.settings[cmd] = {};
				this.settings[cmd][room] = settingsLevels[newRank];
				this.writeSettings();
				this.say(room, 'The command ' + config.commandcharacter + '' + cmd + ' is now ' +
					(settingsLevels[newRank] === newRank ? ' available for users of rank ' + newRank + ' and above.' :
					(this.settings[cmd][room] ? 'available for all users in this room.' : 'unavailable for use in this room.')))
			}
		}
	},
	blacklist: 'autoban',
	ban: 'autoban',
	ab: 'autoban',
	rekt: 'autoban',
	goonhammer: 'autoban',
	autoban: function(arg, by, room) {
		if (!this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;
		if (!this.hasRank(this.ranks[room] || ' ', '@&#~')) return this.say(room, config.nick +'\'s power is too much for you. Come back when you\'re ready.');

		arg = arg.split(',');
		var added = [];
		var illegalNick = [];
		var alreadyAdded = [];
		if (!arg.length || (arg.length === 1 && !arg[0].trim().length)) return this.say(room, 'Who do I need to rekt? ;;');
		for (var i = 0; i < arg.length; i++) {
			var tarUser = toId(arg[i]);
			if (tarUser.length < 1 || tarUser.length > 18) {
				illegalNick.push(tarUser);
				continue;
			}
			if (!this.blacklistUser(tarUser, room)) {
				alreadyAdded.push(tarUser);
				continue;
			}
			this.say(room, '/roomban ' + tarUser + ', fukboi');
			this.say(room, '/modnote ' + tarUser + ' was rekt by ' + by + '.');
			added.push(tarUser);
		}

		var text = '';
		if (added.length) {
			text += 'User(s) "' + added.join('", "') + '" added to blacklist successfully. ';
			this.writeSettings();
		}
		if (alreadyAdded.length) text += 'User(s) "' + alreadyAdded.join('", "') + '" already present in blacklist. ';
		if (illegalNick.length) text += 'All ' + (text.length ? 'other ' : '') + 'users had illegal nicks and were not blacklisted.';
		this.say(room, text);
	},
	unblacklist: 'unautoban',
	unban: 'unautoban',
	unab: 'unautoban',
	unrekt: 'unautoban',
	ungoonhammer: 'unauthban',
	unautoban: function(arg, by, room) {
		if (!this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;
		if (!this.hasRank(this.ranks[room] || ' ', '@&#~')) return this.say(room, config.nick +'\'s power is too much for you . Come back when you\'re ready.');

		arg = arg.split(',');
		var removed = [];
		var notRemoved = [];
		if (!arg.length || (arg.length === 1 && !arg[0].trim().length)) return this.say(room, 'Who do I apologize to?');
		for (var i = 0; i < arg.length; i++) {
			var tarUser = toId(arg[i]);
			if (tarUser.length < 1 || tarUser.length > 18) {
				notRemoved.push(tarUser);
				continue;
			}
			if (!this.unblacklistUser(tarUser, room)) {
				notRemoved.push(tarUser);
				continue;
			}
			this.say(room, '/roomunban ' + tarUser);
			removed.push(tarUser);
		}

		var text = '';
		if (removed.length) {
			text += 'User(s) "' + removed.join('", "') + '" unrekt successfully. #sorrynotsorry. ';
			this.writeSettings();
		}
		if (notRemoved.length) text += (text.length ? 'No other ' : 'No ') + 'specified users were present in the blacklist.';
		this.say(room, text);
	},
	rab: 'regexautoban',
	regexautoban: function(arg, by, room) {
		if (config.regexautobanwhitelist.indexOf(toId(by)) < 0 || !this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;
		if (!this.hasRank(this.ranks[room] || ' ', '@&#~')) return this.say(room, config.nick + ' requires rank of @ or higher to (un)blacklist.');
		if (!arg) return this.say(room, 'You must specify a regular expression to (un)blacklist.');

		try {
			new RegExp(arg, 'i');
		} catch (e) {
			return this.say(room, e.message);
		}

		arg = '/' + arg + '/i';
		if (!this.blacklistUser(arg, room)) return this.say(room, '/' + arg + ' is already present in the blacklist.');

		this.writeSettings();
		this.say(room, '/' + arg + ' was added to the blacklist successfully.');
	},
	unrab: 'unregexautoban',
	unregexautoban: function(arg, by, room) {
		if (config.regexautobanwhitelist.indexOf(toId(by)) < 0 || !this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;
		if (!this.hasRank(this.ranks[room] || ' ', '@&#~')) return this.say(room, config.nick + ' requires rank of @ or higher to (un)blacklist.');
		if (!arg) return this.say(room, 'You must specify a regular expression to (un)blacklist.');

		arg = '/' + arg.replace(/\\\\/g, '\\') + '/i';
		if (!this.unblacklistUser(arg, room)) return this.say(room,'/' + arg + ' is not present in the blacklist.');

		this.writeSettings();
		this.say(room, '/' + arg + ' was removed from the blacklist successfully.');
	},
	viewbans: 'viewblacklist',
	vab: 'viewblacklist',
	viewautobans: 'viewblacklist',
	viewblacklist: function(arg, by, room) {
		if (!this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;

		var text = '';
		if (!this.settings.blacklist || !this.settings.blacklist[room]) {
			text = 'No users are blacklisted in this room.';
		} else {
			if (arg.length) {
				var nick = toId(arg);
				if (nick.length < 1 || nick.length > 18) {
					text = 'Invalid nickname: "' + nick + '".';
				} else {
					text = 'User "' + nick + '" is currently ' + (nick in this.settings.blacklist[room] ? '' : 'not ') + 'blacklisted in ' + room + '.';
				}
			} else {
				var nickList = Object.keys(this.settings.blacklist[room]);
				if (!nickList.length) return this.say(room, '/pm ' + by + ', No users are blacklisted in this room.');
				this.uploadToHastebin('The following users are banned in ' + room + ':\n\n' + nickList.join('\n'), function (link) {
					this.say(room, "/pm " + by + ", Blacklist for room " + room + ": " + link);
				}.bind(this));
				return;
			}
		}
		this.say(room, '/pm ' + by + ', ' + text);
	},
	banphrase: 'banword',
	banword: function(arg, by, room) {
		if (!this.canUse('banword', room, by)) return false;
		if (!this.settings.bannedphrases) this.settings.bannedphrases = {};
		arg = arg.trim().toLowerCase();
		if (!arg) return false;
		var tarRoom = room;

		if (room.charAt(0) === ',') {
			if (!this.hasRank(by, '~')) return false;
			tarRoom = 'global';
		}

		if (!this.settings.bannedphrases[tarRoom]) this.settings.bannedphrases[tarRoom] = {};
		if (arg in this.settings.bannedphrases[tarRoom]) return this.say(room, "Phrase \"" + arg + "\" is already banned.");
		this.settings.bannedphrases[tarRoom][arg] = 1;
		this.writeSettings();
		this.say(room, "Phrase \"" + arg + "\" is now banned.");
	},
	unbanphrase: 'unbanword',
	unbanword: function(arg, by, room) {
		if (!this.canUse('banword', room, by)) return false;
		arg = arg.trim().toLowerCase();
		if (!arg) return false;
		var tarRoom = room;

		if (room.charAt(0) === ',') {
			if (!this.hasRank(by, '~')) return false;
			tarRoom = 'global';
		}

		if (!this.settings.bannedphrases || !this.settings.bannedphrases[tarRoom] || !(arg in this.settings.bannedphrases[tarRoom])) 
			return this.say(room, "Phrase \"" + arg + "\" is not currently banned.");
		delete this.settings.bannedphrases[tarRoom][arg];
		if (!Object.size(this.settings.bannedphrases[tarRoom])) delete this.settings.bannedphrases[tarRoom];
		if (!Object.size(this.settings.bannedphrases)) delete this.settings.bannedphrases;
		this.writeSettings();
		this.say(room, "Phrase \"" + arg + "\" is no longer banned.");
	},
	viewbannedphrases: 'viewbannedwords',
	vbw: 'viewbannedwords',
	viewbannedwords: function(arg, by, room) {
		if (!this.canUse('banword', room, by)) return false;
		arg = arg.trim().toLowerCase();
		var tarRoom = room;

		if (room.charAt(0) === ',') {
			if (!this.hasRank(by, '~')) return false;
			tarRoom = 'global';
		}

		var text = "";
		if (!this.settings.bannedphrases || !this.settings.bannedphrases[tarRoom]) {
			text = "No phrases are banned in this room.";
		} else {
			if (arg.length) {
				text = "The phrase \"" + arg + "\" is currently " + (arg in this.settings.bannedphrases[tarRoom] ? "" : "not ") + "banned " +
					(room.charAt(0) === ',' ? "globally" : "in " + room) + ".";
			} else {
				var banList = Object.keys(this.settings.bannedphrases[tarRoom]);
				if (!banList.length) return this.say(room, "No phrases are banned in this room.");
				this.uploadToHastebin("The following phrases are banned " + (room.charAt(0) === ',' ? "globally" : "in " + room) + ":\n\n" + banList.join('\n'), function (link) {
					this.say(room, (room.charAt(0) === ',' ? "" : "/pm " + by + ", ") + "Banned Phrases " + (room.charAt(0) === ',' ? "globally" : "in " + room) + ": " + link);
				}.bind(this));
				return;
			}
		}
		this.say(room, text);
	},

	/**
	 * General commands
	 *
	 * Add custom commands here.
	 */

	tell: 'say',
	say: function(arg, by, room) {
		if (!this.canUse('say', room, by)) return false;
		this.say(room, stripCommands(arg) + ' (' + by + ' said this)');
	},
	joke: function(arg, by, room) {
		if (!this.canUse('joke', room, by) || room.charAt(0) === ',') return false;
		var self = this;

		var reqOpt = {
			hostname: 'api.icndb.com',
			path: '/jokes/random',
			method: 'GET'
		};
		var req = http.request(reqOpt, function(res) {
			res.on('data', function(chunk) {
				try {
					var data = JSON.parse(chunk);
					self.say(room, data.value.joke.replace(/&quot;/g, "\""));
				} catch (e) {
					self.say(room, 'Sorry, couldn\'t fetch a random joke... :(');
				}
			});
		});
		req.end();
	},
	choose: function(arg, by, room) {
		if (arg.indexOf(',') === -1) {
			var choices = arg.split(' ');
		} else {
			var choices = arg.split(',');
		}
		choices = choices.filter(function(i) {return (toId(i) !== '')});
		if (choices.length < 2) return this.say(room, (room.charAt(0) === ',' ? '': '/pm ' + by + ', ') + config.commandcharacter + 'choose: You must give at least 2 valid choices.');

		var choice = choices[Math.floor(Math.random()*choices.length)];
		this.say(room, ((this.canUse('choose', room, by) || room.charAt(0) === ',') ? '':'/pm ' + by + ', ') + stripCommands(choice));
	},
	usage: 'usagestats',
	usagestats: function(arg, by, room) {
		if (this.canUse('usagestats', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		text += 'http://www.smogon.com/stats/2015-02/';
		this.say(room, text);
	},
	seen: function(arg, by, room) { // this command is still a bit buggy
		var text = (room.charAt(0) === ',' ? '' : '/pm ' + by + ', ');
		arg = toId(arg);
		if (!arg || arg.length > 18) return this.say(room, text + 'Invalid username.');
		if (arg === toId(by)) {
			text += 'are u mentally challenged?';
		} else if (arg === toId(config.nick)) {
			text += 'wtf are you trying to accomplish here';
		} else if (!this.chatData[arg] || !this.chatData[arg].seenAt) {
			text += 'The fukboi ' + arg + ' has not been found.';
		} else {
			text += arg + ' was last seen ' + this.getTimeAgo(this.chatData[arg].seenAt) + ' ago' + (
				this.chatData[arg].lastSeen ? ', ' + this.chatData[arg].lastSeen : '.');
		}
		this.say(room, text);
	},
	'8ball': function(arg, by, room) {
		if (this.canUse('8ball', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}

		var rand = ~~(20 * Math.random()) + 1;

		switch (rand) {
	 		case 1: text += "Signs point to yes."; break;
	  		case 2: text += "Yes."; break;
			case 3: text += "Reply hazy, try again."; break;
			case 4: text += "Without a doubt."; break;
			case 5: text += "My sources say no."; break;
			case 6: text += "As I see it, yes."; break;
			case 7: text += "You may rely on it."; break;
			case 8: text += "Concentrate and ask again."; break;
			case 9: text += "Outlook not so good."; break;
			case 10: text += "It is decidedly so."; break;
			case 11: text += "Better not tell you now."; break;
			case 12: text += "Very doubtful."; break;
			case 13: text += "Yes - definitely."; break;
			case 14: text += "It is certain."; break;
			case 15: text += "Cannot predict now."; break;
			case 16: text += "Most likely."; break;
			case 17: text += "Ask again later."; break;
			case 18: text += "My reply is no."; break;
			case 19: text += "Outlook good."; break;
			case 20: text += "Don't count on it."; break;
		}
		this.say(room, text);
	},

	/**
	 * Room specific commands
	 *
	 * These commands are used in specific rooms on the Smogon server.
	 */
	espaol: 'esp',
	ayuda: 'esp',
	esp: function(arg, by, room) {
		// links to relevant sites for the Wi-Fi room 
		if (config.serverid !== 'showdown') return false;
		var text = '';
		if (room = 'espaol') {
			if (!this.canUse('guia', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return false;
		}
		var messages = {
			reglas: 'Recuerda seguir las reglas de nuestra sala en todo momento: http://ps-salaespanol.weebly.com/reglas.html',
			faq: 'Preguntas frecuentes sobre el funcionamiento del chat: http://ps-salaespanol.weebly.com/faq.html',
			faqs: 'Preguntas frecuentes sobre el funcionamiento del chat: http://ps-salaespanol.weebly.com/faq.html',
			foro: '¡Visita nuestro foro para participar en multitud de actividades! http://ps-salaespanol.proboards.com/',
			guia: 'Desde este índice (http://ps-salaespanol.proboards.com/thread/575/ndice-de-gu) podrás acceder a toda la información importante de la sala. By: Lost Seso',
			liga: '¿Tienes alguna duda sobre la Liga? ¡Revisa el **índice de la Liga** aquí!: (http://goo.gl/CxH2gi) By: xJoelituh'
		};
		text += (toId(arg) ? (messages[toId(arg)] || '¡Bienvenidos a la comunidad de habla hispana! Si eres nuevo o tienes dudas revisa nuestro índice de guías: http://ps-salaespanol.proboards.com/thread/575/ndice-de-gu') : '¡Bienvenidos a la comunidad de habla hispana! Si eres nuevo o tienes dudas revisa nuestro índice de guías: http://ps-salaespanol.proboards.com/thread/575/ndice-de-gu');
		this.say(room, text);
	},
	studio: function(arg, by, room) {
		if (config.serverid !== 'showdown') return false;
		var text = '';
		if (room === 'thestudio') {
			if (!this.canUse('studio', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return false;
		}
		var messages = {
			plug: '/announce The Studio\'s plug.dj can be found here: https://plug.dj/the-studio/'
		};
		this.say(room, text + (messages[toId(arg)] || ('Welcome to The Studio, a music sharing room on PS!. If you have any questions, feel free to PM a room staff member. Available commands for .studio: ' + Object.keys(messages).join(', '))));
	},
	'switch': function(arg, by, room) {
		if (room !== 'gamecorner' || config.serverid !== 'showdown' || !this.canUse('switch', room, by)) return false;
		this.say(room, 'Taking over the world. Starting with Game Corner. Room deregistered.');
		this.say(room, '/k ' + (toId(arg) || by) + ', O3O YOU HAVE TOUCHED THE SWITCH');
	},
	wifi: function(arg, by, room) {
		// links to relevant sites for the Wi-Fi room 
		if (config.serverid !== 'showdown') return false;
		var text = '';
		if (room === 'wifi') {
			if (!this.canUse('wifi', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return false;
		}

		arg = arg.split(',');
		var msgType = toId(arg[0]);
		if (!msgType) return this.say(room, 'Welcome to the Wi-Fi room! Links can be found here: http://pstradingroom.weebly.com/links.html');

		switch (msgType) {
		case 'intro': 
			return this.say(room, text + 'Here is an introduction to Wi-Fi: http://tinyurl.com/welcome2wifi');
		case 'rules': 
			return this.say(room, text + 'The rules for the Wi-Fi room can be found here: http://pstradingroom.weebly.com/rules.html');
		case 'faq':
		case 'faqs':
			return this.say(room, text + 'Wi-Fi room FAQs: http://pstradingroom.weebly.com/faqs.html');
		case 'scammers':
			return this.say(room, text + 'List of known scammers: http://tinyurl.com/psscammers');
		case 'cloners':
			return this.say(room, text + 'List of approved cloners: http://goo.gl/WO8Mf4');
		case 'tips':
			return this.say(room, text + 'Scamming prevention tips: http://pstradingroom.weebly.com/scamming-prevention-tips.html');
		case 'breeders':
			return this.say(room, text + 'List of breeders: http://tinyurl.com/WiFIBReedingBrigade');
		case 'signup':
			return this.say(room, text + 'Breeders Sign Up: http://tinyurl.com/GetBreeding');
		case 'bans':
		case 'banappeals':
			return this.say(room, text + 'Ban appeals: http://tinyurl.com/WifiBanAppeals');
		case 'lists':
			return this.say(room, text + 'Major and minor list compilation: http://tinyurl.com/WifiSheets');
		case 'trainers':
			return this.say(room, text + 'List of EV trainers: http://tinyurl.com/WifiEVtrainingCrew');
		case 'youtube':
			return this.say(room, text + 'Wi-Fi room\'s official YouTube channel: http://tinyurl.com/wifiyoutube');
		case 'league':
			return this.say(room, text + 'Wi-Fi Room Pokemon League: http://tinyurl.com/wifiroomleague');
		case 'checkfc':
			if (!config.googleapikey) return this.say(room, text + 'A Google API key has not been provided and is required for this command to work.');
			if (arg.length < 2) return this.say(room, text + 'Usage: .wifi checkfc, [fc]');
			this.wifiRoom = this.wifiroom || {docRevs: ['', ''], scammers : {}, cloners: []};
			var self = this;
			this.getDocMeta('0AvygZBLXTtZZdFFfZ3hhVUplZm5MSGljTTJLQmJScEE', function (err, meta) {
				if (err) return self.say(room, text + 'An error occured while processing your command.');
				var value = arg[1].replace(/\D/g, '');
				if (value.length !== 12) return self.say(room, text + '"' + arg[1] + '" is not a valid FC.');
				if (self.wifiRoom.docRevs[1] === meta.version) {
					value = self.wifiRoom.scammers[value];
					if (value) return self.say(room, text + '**The FC ' + arg[1] + ' belongs to a known scammer: ' + (value.length > 61 ? value + '..' : value) + '.**');
					return self.say(room, text + 'This FC does not belong to a known scammer.')
				}
				self.wifiRoom.docRevs[1] = meta.version;
				self.getDocCsv(meta, function (data) {
					csv(data, function (err, data) {
						if (err) return self.say(room, text + 'An error occured while processing your command.');
						for (var i = 0, len = data.length; i < len; i++) {
							var str = data[i][1].replace(/\D/g, '');
							var strLen = str.length;
							if (str && strLen > 11) {
								for (var j = 0; j < strLen; j += 12) {
									self.wifiRoom.scammers[str.substr(j, 12)] = data[i][0];
								}
							}
						}
						value = self.wifiRoom.scammers[value];
						if (value) return self.say(room, text + '**The FC ' + arg[1] + ' belongs to a known scammer: ' + (value.length > 61 ? value.substr(0, 61) + '..' : value) + '.**');
						return self.say(room, 'This FC does not belong to a known scammer.');
					});
				});
			});
			break;
		/*
		case 'ocloners':
		case 'onlinecloners':
			if (!config.googleapikey) return this.say(room, text + 'A Google API key has not been provided and is required for this command to work.');
			this.wifiRoom = this.wifiroom || {docRevs: ['', ''], scammers : {}, cloners: []};
			var self = this;
			self.getDocMeta('0Avz7HpTxAsjIdFFSQ3BhVGpCbHVVdTJ2VVlDVVV6TWc', function (err, meta) {
				if (err) {
					console.log(err);
					return self.say(room, text + 'An error occured while processing your command. Please report this!');
				}
				text = '/pm ' + by + ', ';
				if (self.wifiRoom.docRevs[0] == meta.version) {
					var found = [];
					for (var i in self.wifiRoom.cloners) {
						if (self.chatData[toId(self.wifiRoom.cloners[i][0])]) {
							found.push('Name: ' + self.wifiRoom.cloners[i][0] + ' | FC: ' + self.wifiRoom.cloners[i][1] + ' | IGN: ' + self.wifiRoom.cloners[i][2]);
						}
					}
					if (!found.length) {
						self.say(room, text + 'No cloners were found online.');
						return;
					}
					var foundstr = found.join(' ');
					if(foundstr.length > 266) {
						self.uploadToHastebin("The following cloners are online :\n\n" + found.join('\n'), function (link) {
							self.say(room, (room.charAt(0) === ',' ? "" : "/pm " + by + ", ") + link);
						});
						return;
					}
					self.say(room, by, "The following cloners are online :\n\n" + foundstr);
					return;
				}
				self.say(room, text + 'Cloners List changed. Updating...');
				self.wifiRoom.docRevs[0] = meta.version;
				self.getDocCsv(meta, function (data) {
					csv(data, function (err, data) {
						if (err) {
							console.log(err);
							this.say(room, text + 'An error occured while processing your command. Please report this!');
							return;
						}
						data.forEach(function (ent) {
							var str = ent[1].replace(/\D/g, '');
							if (str && str.length >= 12) {
								self.wifiRoom.cloners.push([ent[0], ent[1], ent[2]]);
							}
						});
						var found = [];
						for (var i in self.wifiRoom.cloners) {
							if (self.chatData[toId(self.wifiRoom.cloners[i][0])]) {
								found.push('Name: ' + self.wifiRoom.cloners[i][0] + ' | FC: ' + self.wifiRoom.cloners[i][1] + ' | IGN: ' + self.wifiRoom.cloners[i][2]);
							}
						}
						if (!found.length) {
							self.say(room, text + 'No cloners were found online.');
							return;
						}
						var foundstr = found.join(' ');
						if (foundstr.length > 266) {
							self.uploadToHastebin("The following cloners are online :\n\n" + found.join('\n'), function (link) {
								self.say(room, (room.charAt(0) === ',' ? "" : "/pm " + by + ", ") + link);
							});
							return;
						}
						self.say(room, by, "The following cloners are online :\n\n" + foundstr);
					});
				});
			});
			break;
			
		*/
		default:
			return this.say(room, text + 'Unknown option. General links can be found here: http://pstradingroom.weebly.com/links.html');
		}
	},
	mono: 'monotype',
	monotype: function(arg, by, room) {
		// links and info for the monotype room
		if (config.serverid !== 'showdown') return false;
		var text = '';
		if (room === 'monotype') {
			if (!this.canUse('monotype', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return false;
		}
		var messages = {
			cc: 'The monotype room\'s Core Challenge can be found here: http://monotypeps.weebly.com/core-ladder-challenge.html',
			plug: 'The monotype room\'s plug can be found here: https://plug.dj/monotyke-djs',
			rules: 'The monotype room\'s rules can be found here: http://monotypeps.weebly.com/monotype-room.html',
			site: 'The monotype room\'s site can be found here: http://monotypeps.weebly.com/',
			stats: 'You can find the monotype usage stats here: http://monotypeps.weebly.com/stats.html',
			banlist: 'The monotype banlist can be found here: http://monotypeps.weebly.com/monotype-metagame.html'
		};
		text += messages[toId(arg)] || 'Unknown option. If you are looking for something and unable to find it, please ask monotype room staff for help on where to locate what you are looking for. General information can be found here: http://monotypeps.weebly.com/';
		this.say(room, text);
	},
	survivor: function(arg, by, room) {
		// contains links and info for survivor in the Survivor room
		if (config.serverid !== 'showdown') return false;
		var text = '';
		if (room === 'survivor') {
			if (!this.canUse('survivor', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return false;
		}
		var gameTypes = {
			hg: "The rules for this game type can be found here: http://survivor-ps.weebly.com/hunger-games.html",
			hungergames: "The rules for this game type can be found here: http://survivor-ps.weebly.com/hunger-games.html",
			classic: "The rules for this game type can be found here: http://survivor-ps.weebly.com/classic.html"
		};
		arg = toId(arg);
		if (!arg) return this.say(room, text + "The list of game types can be found here: http://survivor-ps.weebly.com/themes.html");
		text += gameTypes[arg] || "Invalid game type. The game types can be found here: http://survivor-ps.weebly.com/themes.html";
		this.say(room, text);
	},
	games: function(arg, by, room) {
		// lists the games for the games room
		if (config.serverid !== 'showdown') return false;
		var text = '';
		if (room === 'gamecorner') {
			if (!this.canUse('games', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return false;
		}
		this.say(room, text + 'Game List: 1. Would You Rather, 2. NickGames, 3. Scattegories, 4. Commonyms, 5. Questionnaires, 6. Funarios, 7. Anagrams, 8. Spot the Reference, 9. Pokemath, 10. Liar\'s Dice');
		this.say(room, text + '11. Pun Game, 12. Dice Cup, 13. Who\'s That Pokemon?, 14. Pokemon V Pokemon (BST GAME), 15. Letter Getter, 16. Missing Link, 17. Parameters! More information can be found here: http://psgamecorner.weebly.com/games.html');
	},
	thp: 'happy',
	thehappyplace: 'happy',
	happy: function(arg, by, room) {
		// info for The Happy Place
		if (config.serverid !== 'showdown') return false;
		var text = '';
		if (room === 'thehappyplace') {
			if (!this.canUse('happy', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return false;
		}
		arg = toId(arg);
		if (arg === 'askstaff' || arg === 'ask' || arg === 'askannie') {
			text += "http://thepshappyplace.weebly.com/ask-the-staff.html";
		} else {
			text += "The Happy Place, at its core, is a friendly environment for anyone just looking for a place to hang out and relax. We also specialize in taking time to give advice on life problems for users. Need a place to feel at home and unwind? Look no further!";
		}
		this.say(room, text);
	},
	bd: 'battledome',
	battledome: function(arg, by, room) {
		if (config.serverid !== 'showdown') return true;
		var text = '';
		if (room === 'battledome') {
			if (!this.canUse('battledome', room, by)) text += '/pm ' + by + ', ';
		} else if (room.charAt(0) !== ',') {
			return true;
		}
		var messages = {
			smogoonstats: 'Smogoon the Mage\'s Current BattleDome Stats are: Lv.: 15, Exp: 19, BAtk: +3nrg, HP: 100, AB: 9, Energy: 22, Pwr: 2, Dex: 4, Mag: 14',
			smogoonmoney: 'Smogoon the Mage\'s Current BattleDome Money is: 58g, Shillings: 0',
			smogoonequip: 'Smogoon the Mage\'s Current BattleDome Equipment is: Weap: Grimoire/B/Mercury (E), Scripture/C/Neptune (+5 NRG), Ring: Borealis',
			smogoonabilities: 'Abilities: Arcane Blast, Mana Drink, Magic Charge, Fire Ball, Lightning',
		};
		text += messages[toId(arg)] || 'Player not found.';
		this.say(room, text);
	},

	maf: 'mafia',
	mafia: function(arg, by, room) {
		if (config.serverid !== 'showdown') return true;
		if(!arg) return false;
    	if(!this.hasRank(by, '+%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
		if (config.serverid !== 'showdown') return true;
		var text = '';
		var messages = {
		/**
		*hosting commands*/
			sub: '**Looking for a sub in ' + by.substr(1) + '\'s game!(mafiasignup)**',
			rule8: '**Drookez is ALWAYS the mafia. Him not being mafia is against god or something.**',
		
		/**official setups/themes
		*/
			dethy: '**Dethy:** http://ps-mafia.weebly.com/dethy.html',
			classic: '**Classic:** http://ps-mafia.weebly.com/Classic.html',
			aitc: '**Assassins In The Court:**  ',
			cs: '**Closed Setup is a theme where the host does not reveal the role list.',
			vanilla: '**Vanilla:** http://ps-mafia.weebly.com/vanilla.html',
			dethy2: '**Dethy 2.0:** http://ps-mafia.weebly.com/dethy-20.html',
			nommy: '**Nomination:** http://ps-mafia.weebly.com/nomination.html',
			lh: '**Lighthouse:** http://ps-mafia.weebly.com/lighthouse.html',
			eleclassic: '**EleClassic (by Electrolyte):** http://ps-mafia.weebly.com/EleClassic.html',
			captain: '**Captain:** http://ps-mafia.weebly.com/captain1.html',
			pairing: '**Pairing Mafia:** http://ps-mafia.weebly.com/pairing.html',
			gi: '**Greater Idea Role List:** wiki.mafiascum.net/index.php?title=Greater_Idea_Mafia',
			rollrole: '**Role Roll:** http://ps-mafia.weebly.com/roll-role.html',
			shifting: '**Shifting:** http://ps-mafia.weebly.com/shifting.html',
			upick: '**U-Pick:** http://ps-mafia.weebly.com/u-pick.html',
			triplets: '**Triplets:** http://ps-mafia.weebly.com/triplets.html',
			ns: '**No Setup:** http://ps-mafia.weebly.com/no-setup.html',
			esun: '**Eternal Sun:** http://ps-mafia.weebly.com/eternal-sun.html',
			/**UCTs*/
			ssb4: '**Smash Bros 4 Mafia (by Smogoon, Stir, Gligarbro, and Kevikevkev):** (no link, under development)',
			ssb: '**Smash Bros Mafia (by Aelita and Champ):** http://tinyurl.com/ssbmaf',
			clue: '**Clue Mafia (by snackismybae):** tinyurl.com/ClueMafia',
			gipick: '**GIPick: See the GI rolelist, then pick your own role based on your side!** wiki.mafiascum.net/index.php?title=Greater_Idea_Mafia',
			afd: '**All Fall Down (by kilozombie)** http://tinyurl.com/AFDMafia',
			slowsmall: '**Slow Small (by kilozombie)** http://tinyurl.com/SlowSmallMafia',
			goonszelda: '**Zelda Universe Mafia (by Smogoon):** tinyurl.com/GoonsZeldaTheme',
			iclassic: '**Inverse Classic (by snackismybae):** tinyurl.com/InverseClassic',
			ilighthouse: '**Inverse Lighthouse (by snackismybae):** tinyurl.com/InverseLighthouse',
			irishpub: '**Irish Pub Mafia (by snackismybae):** tinyurl.com/IrishPubMafia',
			assdethy: '**Assassin in the Dethy (by snackismybae):** tinyurl.com/AssassinInTheDethy',
			graveyard: '**Graveyard Mafia (by No Lag No Drag):** http://tinyurl.com/GraveyardMafia',
			sonic: '**Sonic Mafia (by TheGrimNinja):** http://bit.ly/1Ewz0PR',
			anarchy: '**Anarchy Mafia (by Gligarbro):** http://tinyurl.com/AnarchyMoofia',
			civilunrest: '**Civil Unrest Mafia (by SlimShadow):** http://goo.gl/jBOfrw',
			fruittrade: '**Fruit Trade Mafia (by snackismybae and smogoon**): http://tinyurl.com/FruitVendorOS',
			train: '**Train Mafia (by Cyberknight98):** http://tinyurl.com/mafiatrain',
		};
		text += messages[toId(arg)] || '???';
		this.say(room, text);
	},
	
maflvl: 'mafialevel',
mafialvl: 'mafialevel',
mlvl: 'mafialevel',
	mafialevel: function(arg, by, room) {
		if (config.serverid !== 'showdown') return true;
		if(!arg) return false;
    	if(!this.hasRank(by, '%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
		if (config.serverid !== 'showdown') return true;
		var text = '';
		var messages = {
		one: '**Users of this level may host Classic, Vanilla, or Assassin in the Court.**',
		two: '**Users of this level may host anything from level one, plus Dethy, Dethy 2.0, Eleclassic, Lighthouse, Nomination, Captain, Triplets, Easy Mafiascum Open Setups.**',
		three: '**Users of this level may host anything in levels one or two, plus also Great/Greater/Greatest/Kindergarten Idea, Closed Setup, Open Setup, Pairing, Shifting, Role Roll, any mafiascum open setup, any UCT.**',
		four: '**Users of this level may host anything, as they are auth.**',
		benbob700k: '**Level 1**',
noguy5: '**Level 1**',
chillitacos: '**Level 1**',
chupps:'**Level 1**',
steadychaos: '**Level 1**',
microsoftexcel: '**Level 1**',
xerosama123: '**Level 1**',
wonto: '**Level 1**',
happeh: '**Level 1**',
herndonchad: '**Level 1**',
coleherndon: '**Level 1**',
paulthegengar: '**Level 1**',
adkon: '**Level 1**',
aorta: '**Level 1**',
georgiaokeeffe: '**Level 1**',
woodboys23: '**Level 1**',
wonto: '**Level 1**',
sexyscrambles: '**Level 2**',
pieIsAlwaysRight: '**Level 1**',
like8: '**Level 1**',
spieky: '**Level 2**',
epicsnorlax: '**Level 2**',
yoshiebi: '**Level 2**',
illusio: '**Level 2**',
ultrasplot: '**Level 2**',
douevenswitchbro: '**Level 2**',
ayaan03: '**Level 2**',
darklight1999: '**Level 2**',
rabbac: '**Level 2**',
aleuser: '**Level 2**',
goodmorningespeon: '**Level 2**',
viperfang4: '**Level 2**',
chundermunch: '**Level 2**',
mizukagecyan: '**Level 2**',
ancienctgraywolf: '**Level 2**',
gligarbro: '**Level 2**',
cyberknight98: '**Level 3**',
fortyellowcastle: '**Level 3**',
eruditer: '**Level 3**',
smogoon: '**Level 3**',
thegrimninja: '**Level 3**',
lucyheartfilia: '**Level 3**',
snackismybae: '**Level 3**',
pokechow: '**Level 3**',
thewhodoctor: '**Level 4**',
looker29: '**Level 4**',
galom: '**Level 4**',
immafirinmahlazer: '**Level 4**',
myway21: '**Level 4**',
doctorgucci: '**Level 4**',
odm: '**Level 4**',
		pieloveseveryone: '**Level 4**',
		sanjana: '**Level 4**',
		stir: '**Level 4**',
		sunintobandito: '**Level 4**',
		superstarsrock: '**Level 4**',
		macle: '**Level 4**',
		thevexinator: '**Level 4**',
		pikacal: '**Level 4**',
		rssp1: '**Level 4**',
		drookez: '**Level 4**',
		electrolyte: '**Level 4**',
		transmuter: '**Level 4**',
		aelita: '**Level 4**',
		ajhockeystar: '**Level 4**',
		skarmchikora: '**Level 4**',
		coronis: '**Level 4**',
		snaquaza: '**Level 4**',
		
		};
		text += messages[toId(arg)] || 'Player is not registered ';
		this.say(room, text);
	},
	
mafth: 'maftheme',
mafrl: 'maftheme',
themerl: 'maftheme',
	maftheme: function(arg, by, room) {
	    if(!arg) return false;
    	if(!this.hasRank(by, '+%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
		if (config.serverid !== 'showdown') return true;
		var text = '';
		var messages = {
			classic6: '**2 Mafia, 1 Doctor, 1 Cop, 2 Villagers (Starts Night 0)**',
			classic7: '**2 Mafia, 1 Doctor, 1 Cop, 3 Villagers**',
			classic8: '**2 Mafia (1 is PL), 1 Doctor, 1 Cop, 4 Villagers**',
			classic9: '**2 Mafia, 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 3 Villagers**',
			classic10: '**2 Mafia, 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 4 Villagers**',
			classic11: '**3 Mafia, 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Mayor, 3 Villagers**',
			classic12: '**3 Mafia, 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Mayor, 4 Villagers**',
			classic13: '**3 Mafia, 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Mayor, 5 Villagers**',
			classic14: '**3 Mafia (1 is PL), 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Jailkeeper, 1 Mayor, 5 Villagers**',
			classic15: '**3 Mafia (1 is PL, 1 is Cop), 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Jailkeeper, 1 Mayor,  6 Villagers**',
			classic16: '**3 Mafia (1 is PL, 1 is Cop), 1 Werewolf, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Jailkeeper, 1 Mayor, 7 Villagers**',
			classic17: '**3 Mafia (1 is PL, 1 is Cop), 2 Werewolves, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Jailkeeper, 1 Mayor, 7 Villagers**',
			classic18: '**3 Mafia (1 is PL, 1 is Cop), 2 Werewolves, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Jailkeeper, 2 Mayors, 7 Villagers**',
			classic19: '**4 Mafia (1 is PL, 1 is Cop), 2 Werewolves, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Jailkeeper, 2 Mayors, 7 Villagers**',
			classic20: '**4 Mafia (1 is PL, 1 is Cop), 2 Werewolves, 1 Doctor, 1 Cop, 1 Pretty Lady, 1 Jailkeeper, 2 Mayors, 8 Villagers**',
			dethy5: '**1 Sane Cop, 1 Insane Cop, 1 Paranoid Cop, 1 Naive Cop, 1 Mafia. (starts night 0)**',
			dethy10: '**2 Sane Cops, 2 Insane Cops, 2 Paranoid Cops, 2 Naive Cops, 2 Mafia. (starts night 0)**',
			eleclassic6: '**2 Mafia, 1 Cop, 1 Doc, 1 WW, 1 Tamer**',
			eleclassic7: '**2 Mafia, 1 Cop, 1 Doc, 1 WW, 1 Tamer, 1 PL**',
			eleclassic8: '**2 Mafia, 1 Cop, 1 Doc, 1 WW, 1 Tamer, 1 PL, 1 OD**',
			eleclassic9: '**2 Mafia (1 is a Tamer), 1 Cop, 1 Doc, 1 PL, 2 WW, 1 Tamer, 1 OD**',
			eleclassic10: '**3 Mafia (1 is a Tamer), 1 Cop, 1 Doc, 1 PL, 2 WW, 1 Tamer, 1 OD**',
			eleclassic11: '**3 Mafia (1 is a Tamer), 1 Cop, 1 Doc, 1 PL, 2 WW, 1 Tamer, 1 OD, 1 Bomber**',
            lighthouse6: '**1 Mafia, 1 Oracle, 2 Gunsmiths, 1 Lightkeeper**',
            lighthouse7: '**2 Mafia, 2 Oracles, 1 Gunsmith, 1 Lightkeeper (Start at N0)**',
            lighthouse8: '**2 Mafia, 3 Oracles, 2 Gunsmiths, 1 Lightkeeper**',
			lighthouse9: '**3 Mafia, 3 Oracles, 2 Gunsmiths, 1 Lightkeeper**',
            lighthouse10: '**3 Mafia, 4 Oracles, 2 Gunsmiths, 1 Lightkeeper**',                                        
			lighthouse12: '**4 Mafia, 4 Oracles, 3 Gunsmiths, 1 Lightkeeper or 4 Mafia, 5 Oracles, 2 Gunsmiths, 1 Lightkeeper**',
			dethytwo6: '**1 Mafia, 1 Sane Cop, 1 Naive Cop, 1 Paranoid Cop, 1 Hopeful Cop, 1 Vigilante**',
			dethytwo7: '**2 Mafia, 1 Sane Cop, 1 Naive Cop, 1 Paranoid Cop, 1 Hopeful Cop, 1 Vigilante**',
			dethytwo9: '**3 Mafia, 1 Sane Cop, 1 Naive Cop, 1 Paranoid Cop, 1 Hopeful Cop, 2 Vigilantes**',
			captain6: '**2 Mafia, 1 Cop, 1 Doctor, 1 Pretty Lady, 1 Captain**',
			esun4: '**1 Mafia Compulsive Janitor, 1 Town Coroner, 1 Town Gunsmith, 1 Vanilla Townie**',
			esun5: '**1 Mafia Compulsive Janitor, 1 Town Coroner, 1 Town Gunsmith, 2 Vanilla Townies**',
			esun6: '**1 Mafia Compulsive Janitor, 1 Mafia Coroner, 1 Town Coroner, 1 Town Gunsmith, 1 One-Shot Reviver, 1 Vanilla Townie**',
			esun7: '**1 Mafia Compulsive Janitor, 1 Mafia Coroner, 1 Town Coroner, 1 Town Gunsmith, 1 One-Shot Reviver, 2 Vanilla Townies**',
			esun8: '**1 Mafia Compulsive Janitor, 1 Mafia Coroner, 1 Town Coroner, 1 Town Gunsmith, 1 One-Shot Reviver, 3 Vanilla Townies**',
			esun9: '**1 Mafia Compulsive Janitor, 1 Mafia Goon, 1 Mafia Coroner, 2 Town Coroners, 1 Town Gunsmith, 1 One-Shot Reviver, 2 Vanilla Townies**',
			esun10: '**1 Mafia Compulsive Janitor, 1 Mafia Goon, 1 Mafia Coroner, 2 Town Coroners, 1 Town Gunsmith, 1 One-Shot Reviver, 3 Vanilla Townies**',
			nommy7: '**2 Mafia, 5 Villagers**',
			nommy11: '**3 Mafia, 8 Villagers**',
			afd6: '**1 Mafia, 1 Vengeful Townie, 4 Villagers**',
			afd7: '**1 Mafia, 1 Vengeful Townie, 1 Lonely Townie, 4 Villagers**',
			afd8: '**1 Mafia, 1 Vengeful Townie, 1 Lonely Townie, 5 Villagers**',
			afd9: '**1 Mafia, 1 Vengeful Townie, 1 Lonely Townie, 6 Villagers**',
			afd10: '**1 Powerful Mafia, 1 Vengeful Townie, 1 Lonely Townie, 1 Do-Gooder, 1 Policeman, 1 Miller, 4 Villagers**',
			afd11: '**1 Powerful Mafia, 1 Vengeful Townie, 1 Lonely Townie, 1 Do-Gooder, 1 Policeman, 1 Miller, 5 Villagers**',
			afd12: '**1 Powerful Mafia, 1 Vengeful Townie, 1 Lonely Townie, 1 Do-Gooder, 1 Policeman, 1 Miller, 6 Villagers**',
			slowsmall4: '**1 Murderer, 1 Doctor, 1 1-shot Day-Vigilante, 1 Villager**',
			slowsmall5: '**1 Murderer, 1 Doctor, 1 1-shot Day-Vigilante, 2 Villagers**',
			slowsmall6: '**2 Murderers, 1 Doctor, 1 1-shot Day-Vigilante, 2 Villagers**',
			slowsmall7: '**2 Murderers, 1 Doctor, 1 1-shot Day-Vigilante, 3 villagers**',
			slowsmall8: '**2 Murderers, 1 Doctor, 1 1-shot Day-Vigilante, 4 Villagers**',
			clue6: '**Ms. Scarlett, Col. Mustard, Mrs. White, Rev. Green, Mrs. Peacock, Prof. Plum (One is Murderer)**',
			graveyard6: '**1 Poltergiest, 1 Cop, 1 Jailer, 1 Medium,  1 Mafia, 1 Grave Digger**',
			graveyard7: '**1 Poltergiest, 1 Cop, 1 Jailer, 1 Medium,  1 Mafia, 1 Grave Digger, 1 Villager**',
			graveyard8: '**1 Poltergiest, 1 Cop, 1 Jailer, 1 Medium,  2 Mafia, 1 Grave Digger, 1 Villager**',
			gradeyard9: '**1 Poltergiest, 1 Cop, 1 Jailer, 1 Medium, 2 Mafia, 1 Grave Digger, 2 Villagers**',
			gradeyard10: '**1 Poltergiest, 1 Cop, 1 Jailer, 1 Medium, 1 Zombie, 2 Mafia, 1 Grave Digger, 2 Villagers**',
			graveyard11: '**1 Poltergiest, 1 Cop, 1 Jailer, 1 Medium, 2 Mafia, 1 Grave Digger, 3 Villagers**',
			sonic6: '**Eggman, Shadow, Sonic, Tails, Silver, Vector (Start on N0)**',
			sonic7: '**Eggman, Shadow, Sonic, Tails, Silver, Vector, Amy**',
			sonic9:  '**Eggman, Shadow, Sonic, Tails, Silver, Vector, Blaze, Amy, Rouge**',
			sonic10: '**Eggman, Shadow, Sonic, Tails, Silver, Vector, Blaze, Knuckles, Amy, Rouge**',
			sonic11: '**Eggman, Shadow, Metal Sonic, Sonic, Tails, Silver, Vector, Blaze, Knuckles, Amy, Rouge**',
			fruittrade6: '**1 Mafia Fruit Vendor, 1 Mafia PL, 2 Fruit Vendor, 1 Tracker, 1 Watcher (begins night 0)**',
			fruittrade7: '**1 Mafia Fruit Vendor, 1 Mafia PL, 3 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade8: '**1 Mafia Fruit Vendor, 1 Mafia PL, 4 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade9: '**1 Mafia Fruit Vendor, 1 Mafia PL, 4 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade10: '**1 Mafia Parrot, 1 Mafia Fruit Vendor, 1 Mafia PL, 3 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade11: '**1 Mafia Parrot, 1 Mafia Fruit Vendor, 1 Mafia PL, 4 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade12: '**1 Mafia Parrot, 1 Mafia Fruit Vendor, 1 Mafia PL, 5 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade13: '**1 Mafia Parrot, 1 Mafia Fruit Vendor, 1 Mafia PL, 6 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade14: '**2 Mafia Parrots, 1 Mafia Fruit Vendor, 1 Mafia PL, 6 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
			fruittrade15: '**2 Mafia Parrots, 1 Mafia Fruit Vendor, 1 Mafia PL, 7 Fruit Vendor, 1 Tracker, 1 Watcher, 1 Fruit Storer**',
};
		text += messages[toId(arg)] || '???';
		this.say(room, text);
	},

	
r: 'rolelist',
roles: 'rolelist',
role: 'rolelist',
	rolelist: function(arg, by, room) {
		if(!arg) return false;
    	if(!this.hasRank(by, '%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
		if (config.serverid !== 'showdown') return true;
		var text = '';
		var messages = {
		absorber: 'http://wiki.mafiascum.net/index.php?title=Absorber',
actor: 'http://wiki.mafiascum.net/index.php?title=Actor',
alarmist: 'http://wiki.mafiascum.net/index.php?title=Alarmist',
alein: 'http://wiki.mafiascum.net/index.php?title=Alien',
arsonist: 'http://wiki.mafiascum.net/index.php?title=Arsonist',
ascetic: 'http://wiki.mafiascum.net/index.php?title=Ascetic',
assassin: 'http://wiki.mafiascum.net/index.php?title=Assassin',
babysitter: 'http://wiki.mafiascum.net/index.php?title=Babysitter',
belovedprincess: 'http://wiki.mafiascum.net/index.php?title=Beloved_Princess',
bodyguard: 'http://wiki.mafiascum.net/index.php?title=Bodyguard',
bomb: 'http://wiki.mafiascum.net/index.php?title=Bomb',
bulletproof: 'http://wiki.mafiascum.net/index.php?title=Bulletproof',
busdriver: 'http://wiki.mafiascum.net/index.php?title=Bus_driver',
captain: 'http://wiki.mafiascum.net/index.php?title=Captain',
commuter: 'http://wiki.mafiascum.net/index.php?title=Commuter',
cop: 'http://wiki.mafiascum.net/index.php?title=Cop',
coroner: 'http://wiki.mafiascum.net/index.php?title=Coroner',
cprdoctor: 'http://wiki.mafiascum.net/index.php?title=CPR_Doctor',
cult: 'http://wiki.mafiascum.net/index.php?title=Cult',
cult_leader: 'http://wiki.mafiascum.net/index.php?title=Cult_Leader',
cultafia: 'http://wiki.mafiascum.net/index.php?title=Cultafia',
cultist: 'http://wiki.mafiascum.net/index.php?title=Cultist',
deathproof: 'http://wiki.mafiascum.net/index.php?title=Deathproof',
deflector: 'http://wiki.mafiascum.net/index.php?title=Deflector',
deprogrammer: 'http://wiki.mafiascum.net/index.php?title=Deprogrammer',
deputy: 'http://wiki.mafiascum.net/index.php?title=Deputy',
desperado: 'http://wiki.mafiascum.net/index.php?title=Desperado_(role)',
diginova: 'http://wiki.mafiascum.net/index.php?title=Diginova',
doctor: 'http://wiki.mafiascum.net/index.php?title=Doctor',
doublevoter: 'http://wiki.mafiascum.net/index.php?title=Doublevoter',
dreaminggod: 'http://wiki.mafiascum.net/index.php?title=Dreaming_God',
enabler: 'http://wiki.mafiascum.net/index.php?title=Enabler',
encryptor: 'http://wiki.mafiascum.net/index.php?title=Encryptor',
executioner: 'http://wiki.mafiascum.net/index.php?title=Executioner',
faithhealer: 'http://wiki.mafiascum.net/index.php?title=Faith_healer',
false: 'http://wiki.mafiascum.net/index.php?title=False',
fbiagent: 'http://wiki.mafiascum.net/index.php?title=FBI_Agent',
firefighter: 'http://wiki.mafiascum.net/index.php?title=Firefighter',
fisherman: 'http://wiki.mafiascum.net/index.php?title=Fisherman',
flavorcop: 'http://wiki.mafiascum.net/index.php?title=Flavor_Cop',
follower: 'http://wiki.mafiascum.net/index.php?title=Follower',
forensicinvestigator: 'http://wiki.mafiascum.net/index.php?title=Forensic_Investigator',
franer: 'http://wiki.mafiascum.net/index.php?title=Framer',
friendlyneighbor: 'http://wiki.mafiascum.net/index.php?title=Friendly_Neighbor',
gladiator: 'http://wiki.mafiascum.net/index.php?title=Gladiator',
godfather: 'http://wiki.mafiascum.net/index.php?title=Godfather',
goo: 'http://wiki.mafiascum.net/index.php?title=Goo',
goon: 'http://wiki.mafiascum.net/index.php?title=Goon',
governor: 'http://wiki.mafiascum.net/index.php?title=Governor',
guard: 'http://wiki.mafiascum.net/index.php?title=Guard',
gunsmith: 'http://wiki.mafiascum.net/index.php?title=Gunsmith',
hammerer: 'http://wiki.mafiascum.net/index.php?title=Hammerer',
hated: 'http://wiki.mafiascum.net/index.php?title=Hated',
hero: 'http://wiki.mafiascum.net/index.php?title=Hero',
hidden: 'http://wiki.mafiascum.net/index.php?title=Hidden',
hider: 'http://wiki.mafiascum.net/index.php?title=Hider',
hooker: 'http://wiki.mafiascum.net/index.php?title=Hooker',
innocentchild: 'http://wiki.mafiascum.net/index.php?title=Innocent_Child',
inquisitor: 'http://wiki.mafiascum.net/index.php?title=Inquisitor',
inventor: 'http://wiki.mafiascum.net/index.php?title=Inventor',
jackofalltrades: 'http://wiki.mafiascum.net/index.php?title=Jack-of-all-trades',
jailkeeper: 'http://wiki.mafiascum.net/index.php?title=Jailkeeper',
janitor: 'http://wiki.mafiascum.net/index.php?title=Janitor',
jester: 'http://wiki.mafiascum.net/index.php?title=Jester',
judas: 'http://wiki.mafiascum.net/index.php?title=Judas',
king: 'http://wiki.mafiascum.net/index.php?title=King',
liedetector: 'http://wiki.mafiascum.net/index.php?title=Lie_Detector',
lightningrod: 'http://wiki.mafiascum.net/index.php?title=Lightning_Rod',
loved: 'http://wiki.mafiascum.net/index.php?title=Loved',
lover: 'http://wiki.mafiascum.net/index.php?title=Lover',
loyal: 'http://wiki.mafiascum.net/index.php?title=Loyal',
lynchee: 'http://wiki.mafiascum.net/index.php?title=Lynchee',
lyncher: 'http://wiki.mafiascum.net/index.php?title=Lyncher',
lynchproof: 'http://wiki.mafiascum.net/index.php?title=Lynchproof',
mafia: 'http://wiki.mafiascum.net/index.php?title=Mafia',
mailman: 'http://wiki.mafiascum.net/index.php?title=Mailman',
mason: 'http://wiki.mafiascum.net/index.php?title=Mason',
mentor: 'http://wiki.mafiascum.net/index.php?title=Mentor',
miller: 'http://wiki.mafiascum.net/index.php?title=Miller',
mime: 'http://wiki.mafiascum.net/index.php?title=Mime',
motiondetector: 'http://wiki.mafiascum.net/index.php?title=Motion_Detector',
motivator: 'http://wiki.mafiascum.net/index.php?title=Motivator',
multipleuserpersonality: 'http://wiki.mafiascum.net/index.php?title=Multiple_User_Personality',
namedtownie: 'http://wiki.mafiascum.net/index.php?title=Named_Townie',
neighbor: 'http://wiki.mafiascum.net/index.php?title=Neighbor',
neighborizer: 'http://wiki.mafiascum.net/index.php?title=Neighborizer',
nexus: 'http://wiki.mafiascum.net/index.php?title=Nexus_(Role)',
ninja: 'http://wiki.mafiascum.net/index.php?title=Ninja',
normaliser: 'http://wiki.mafiascum.net/index.php?title=Normaliser',
nurse: 'http://wiki.mafiascum.net/index.php?title=Nurse',
oracle: 'http://wiki.mafiascum.net/index.php?title=Oracle',
paranoidgunowner: 'http://wiki.mafiascum.net/index.php?title=Paranoid_Gun_Owner',
percentage: 'http://wiki.mafiascum.net/index.php?title=Percentage',
poisondoctor: 'http://wiki.mafiascum.net/index.php?title=Poison_Doctor',
poisoner: 'http://wiki.mafiascum.net/index.php?title=Poisoner',
postrestriction: 'http://wiki.mafiascum.net/index.php?title=Post_Restriction',
priest: 'http://wiki.mafiascum.net/index.php?title=Priest',
psychiatrist: 'http://wiki.mafiascum.net/index.php?title=Psychiatrist',
redirector: 'http://wiki.mafiascum.net/index.php?title=Redirector',
reporter: 'http://wiki.mafiascum.net/index.php?title=Reporter',
restlessspirit: 'http://wiki.mafiascum.net/index.php?title=Restless_Spirit',
reviver: 'http://wiki.mafiascum.net/index.php?title=Reviver',
rolecop: 'http://wiki.mafiascum.net/index.php?title=Role_Cop',
roleblocker: 'http://wiki.mafiascum.net/index.php?title=Roleblocker',
rolestopper: 'http://wiki.mafiascum.net/index.php?title=Rolestopper',
saulus: 'http://wiki.mafiascum.net/index.php?title=Saulus',
sensor: 'http://wiki.mafiascum.net/index.php?title=Sensor',
seraphknight: 'http://wiki.mafiascum.net/index.php?title=Seraph_Knight',
serialkiller: 'http://wiki.mafiascum.net/index.php?title=Serial_Killer',
sidekick: 'http://wiki.mafiascum.net/index.php?title=Sidekick',
strongwilled: 'http://wiki.mafiascum.net/index.php?title=Strong-Willed',
strongman: 'http://wiki.mafiascum.net/index.php?title=Strongman',
suicidal: 'http://wiki.mafiascum.net/index.php?title=Suicidal',
suicidebomber: 'http://wiki.mafiascum.net/index.php?title=Suicide_Bomber',
survivor: 'http://wiki.mafiascum.net/index.php?title=Survivor',
switch: 'http://wiki.mafiascum.net/index.php?title=Switch',
theflyingpumpkinthatshootslaserbeamsoutofitsass: 'http://wiki.mafiascum.net/index.php?title=The_Flying_Pumpkin_That_Shoots_Laser_Beams_Out_Of_Its_Ass',
theoracle: 'http://wiki.mafiascum.net/index.php?title=The_Oracle',
thief: 'http://wiki.mafiascum.net/index.php?title=Thief',
townie: 'http://wiki.mafiascum.net/index.php?title=Townie',
tracker: 'http://wiki.mafiascum.net/index.php?title=Tracker',
traitor: 'http://wiki.mafiascum.net/index.php?title=Traitor',
treestump: 'http://wiki.mafiascum.net/index.php?title=Tree_Stump',
triggered: 'http://wiki.mafiascum.net/index.php?title=Triggered',
universalbackup: 'http://wiki.mafiascum.net/index.php?title=Universal_Backup',
unlyncher: 'http://wiki.mafiascum.net/index.php?title=Unlyncher',
usurper: 'http://wiki.mafiascum.net/index.php?title=Usurper',
vampire: 'http://wiki.mafiascum.net/index.php?title=Vampire',
vanillacop: 'http://wiki.mafiascum.net/index.php?title=Vanilla_Cop',
vanillaiser: 'http://wiki.mafiascum.net/index.php?title=Vanillaiser',
vengeful: 'http://wiki.mafiascum.net/index.php?title=Vengeful_(Role)',
vigilante: 'http://wiki.mafiascum.net/index.php?title=Vigilante',
virgin: 'http://wiki.mafiascum.net/index.php?title=Virgin',
visitor: 'http://wiki.mafiascum.net/index.php?title=Visitor',
votethief: 'http://wiki.mafiascum.net/index.php?title=Vote_Thief',
voteless: 'http://wiki.mafiascum.net/index.php?title=Voteless',
voyeur: 'http://wiki.mafiascum.net/index.php?title=Voyeur',
watcher: 'http://wiki.mafiascum.net/index.php?title=Watcher',
weakdoctor: 'http://wiki.mafiascum.net/index.php?title=Weak_Doctor',
werewolf: 'http://wiki.mafiascum.net/index.php?title=Werewolf_(Role)',
zombielord: 'http://wiki.mafiascum.net/index.php?title=Zombie_Lord',


		};
		text += messages[toId(arg)] || 'Role currently not installed.';
		this.say(room, text);
	},




		
	/**
	 * Jeopardy commands
	 *
	 * The following commands are used for Jeopardy in the Academics room
	 * on the Smogon server.
	 */


	b: 'buzz',
	buzz: function(arg, by, room) {
		if (this.buzzed || !this.canUse('buzz', room, by) || room.charAt(0) === ',') return false;
		this.say(room, '**' + by.substr(1) + ' has buzzed in!**');
		this.buzzed = by;
		this.buzzer = setTimeout(function(room, buzzMessage) {
			this.say(room, buzzMessage);
			this.buzzed = '';
		}.bind(this), 7 * 1000, room, by + ', your time to answer is up!');
	},
	reset: function(arg, by, room) {
		if (!this.buzzed || !this.hasRank(by, '%@&#~') || room.charAt(0) === ',') return false;
		clearTimeout(this.buzzer);
		this.buzzed = '';
		this.say(room, 'The buzzer has been reset.');
	},
	
	
	/**
	*Smogoon playing with hosting commands
	**/

	

hosting: 'mafiahost',
host: 'mafiahost',
perms: 'mafiahost',
mhost: 'mafiahost',
    mafiahost: function(arg, by, room){
    	if(!this.hasRank(by, '%@#&~') && !(this.hasRank(by, '+') && toId(arg) === toId(by)) )return false;
    	mafhost[mafhost.length] = toId(arg);
    	fs.appendFile('data/hostlist.txt', toId(arg) + '\n', function(){});
    	this.say(room, '**' + toId(arg) + ' has been given hosting perms.**')
    	var tarDate = new Date();
    	fs.appendFile('data/hostlogs.txt', '[' + tarDate + '] ' + by + ' set ' + toId(arg) + ' as the host.' + '\n')
    },

    resethost: 'clearhost',
    clearhost: function(arg, by, room){
    	if(!this.hasRank(by, '%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
    	mafhost = [];
    	this.say(room, 'Thanks for hosting with MafGoonBott.');
    	fs.writeFileSync('data/hostlist.txt', '');
    	var tarDate = new Date();
    	fs.appendFile('data/hostlogs.txt', '[' + tarDate + '] ' + by + ' reset all these hosts.' + '\n')
    },
	
	rr: 'rolerandomizer',
	roler: 'rolerandomizer',
	rolerandomizer: function(arg, by, room) {
		if(!arg) return false;
    	if(!this.hasRank(by, '%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
		if (config.serverid !== 'showdown') return true;
		
		if (arg.indexOf(',') === -1) {
			var choices = arg.split(' ');
		} else {
			var choices = arg.split(',');
		}
		choices = choices.filter(function(i) {return (toId(i) !== '')});
		if (choices.length < 2) return this.say(room, (room.charAt(0) === ',' ? '': '/pm ' + by + ', ') + config.commandcharacter + 'wtf, wtf do i choose from you twit');

		var choice = choices[Math.floor(Math.random()*choices.length)];
		this.say(room, ((this.canUse('choose', room, by) || room.charAt(0) === ',') ? '':'/pm ' + by + ', ') + stripCommands(choice));
	},


	rtheme: 'randomtheme',
	randomt: 'randomtheme',
	'randomtheme': function(arg, by, room) {
		if (this.canUse('8ball', room, by) || room.charAt(0) === ',') {
		if(!arg) return false;
    	if(!this.hasRank(by, '%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
		if (config.serverid !== 'showdown') return true;
		
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}

		var rand = ~~(20 * Math.random()) + 1;

		switch (rand) {
	 		case 1: text += "Classic."; break;
	  		case 2: text += "Dethy."; break;
			case 3: text += "EleClassic."; break;
			case 4: text += "UCT (have people vote for a UCT)"; break;
			case 5: text += "Closed Setup (command coming soon!)"; break;
			case 6: text += "Dethy 2.0"; break;
			case 7: text += "Eternal Sun."; break;
			case 8: text += "Assassin in the Court."; break;
			case 9: text += "Vanilla."; break;
			case 10: text += "Nomination."; break;
			case 11: text += "Lighthouse."; break;
			case 12: text += "Captain."; break;
			case 13: text += "Pairing."; break;
			case 14: text += "Role Roll."; break;
			case 15: text += "Shifting."; break;
			case 16: text += "Greater Idea."; break;
			case 17: text += "Triplets."; break;
			case 18: text += "No Setup."; break;
			case 19: text += "Super Smash Bros.."; break;
			case 20: text += "Try again later."; break;
		}
		this.say(room, text);
	},
	
    d: 'roll',
	giroll: 'roll',
	gir: 'roll',
    r: 'roll',
    dice: 'roll',
    roll: function(arg, by, room){
    	if(!arg) return false;
    	if(!this.hasRank(by, '+%@#&~') && mafhost.indexOf(toId(by)) < 0) return false;
    	var spl = arg.split('d');
    	if(!spl[1] || !spl[0]){
    		if(!spl[0]){
    			spl[0] = spl[1];
    		}
    		var random = Math.floor(Math.random()*spl[0]) + 1;
    		this.say(room, '**Roll:** ' + random);
    	} else {
    		var random = 0;
    		var text = '(Individual rolls: ';
    		for(var i = 0; i < spl[0]; i++){
    			tarDice = Math.floor(Math.random()*spl[1]) + 1;
    			random += tarDice;
    			text += tarDice;
    			if(i < (spl[0] - 1)){
    				text += ', ';
    			}
    		}
    		text += ')';
    		if(spl[0] > 20){
    			text = '';
    		}
    		this.say(room, text + ' **Roll:** ' + random);
    	}
    },
	
gpc: 'goonsprivatecommands',
goons: 'goonsprivatecommands',
privategoon: 'goonsprivatecommands',
goonscommands: 'goonsprivatecommands',
	goonsprivatecommands: function(arg, by, room) {
		if(!arg) return false;
    	if(!this.hasRank(by, '&~') && mafhost.indexOf(toId(by)) < 0) return false;
		if (config.serverid !== 'showdown') return true;
		var text = '';
		var messages = {
			vendortables: 'http://tinyurl.com/FruitVendorTables',
			cluetables: 'http://tinyurl.com/GoonsClueTables',
			ssb4brain: 'https://docs.google.com/document/d/1JDsNfoFJC9Wr4rpW1KEVQm49dm2E_6ZKEq5IENMDBd0/edit',
			ssb4dlc: 'no link. goon2lazy',
			mage: 'Lv: 20, Gd: 140, Shll: 6, Exp: 3, BAtk: +3NRG, 9AB, 107hp, 23NRG, [Grim: 7ab/B/Merc]/[Scrip: BAtk +5nr/4ab/C/Nept]/[Tome: +3nrg/4ab/D/None], Borealis Ring, Ablts: [Arcane Blast/Mana Drink/Magic Charge/Fire Ball/Lightning]',
		};
		text += messages[toId(arg)] || 'Commands not found. Please try again when you are Smogoon.';
		this.say(room, text);
	},
	
	puppies: function(arg, by, room) {
		var text = config.excepts.indexOf(toId(by)) < 0 ? '/pm ' + by + ', ' : '';
		text += 'Smogoon\'s Puppies: http://imgur.com/a/rtuBd';
		this.say(room, text);
	},
};
