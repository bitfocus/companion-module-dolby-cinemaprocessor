// Dolby Cinema Processor

var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	let self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.MODELS = [
	{ id: 'cp650', label: 'CP650'},
	{ id: 'cp950', label: 'CP950'}
];

instance.prototype.CHOICES_FORMATS = [
	{ id: '0', label: 'Format 01' },
	{ id: '1', label: 'Format 04' },
	{ id: '2', label: 'Format 05' },
	{ id: '3', label: 'Format 10' },
	{ id: '4', label: 'Format 11' },
	{ id: '5', label: 'User format 1' },
	{ id: '6', label: 'User format 2' },
	{ id: '7', label: 'Nonsync format' }
];

instance.prototype.FADER_LEVEL = 85;

instance.prototype.MUTE_STATUS = null;

instance.prototype.TIMER_FADER = null;

instance.prototype.updateConfig = function(config) {
	let self = this;

	self.config = config;
	self.initVariables();
	self.initFeedbacks();
	self.initPresets();
	self.init_tcp();
};

instance.prototype.init = function() {
	let self = this;

	debug = self.debug;
	log = self.log;

	self.initVariables();
	self.initFeedbacks();
	self.initPresets();
	self.init_tcp();
};

instance.prototype.init_tcp = function() {
	let self = this;
	let cmd;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.port === undefined) {
		switch(self.config.model) {
			case 'cp650':
				self.config.port = 61412;
				break;
			case 'cp950':
				self.config.port = 61408;
		}
	}

	if (self.config.host && self.config.port) {
		self.socket = new tcp(self.config.host, self.config.port);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug('Network error', err);
			self.log('error','Network error: ' + err.message);
		});

		self.socket.on('connect', function () {
			debug('Connected');
			if (self.config.model === 'cp650') {
				cmd = 'all=?\r\n';
				self.socket.send(cmd);
			}
			else if (self.config.model === 'cp950') {
				cmd = 'sys.fader ?';
				self.socket.send(cmd);
				
				setTimeout(function () {
					cmd = 'sys.mute ?';
					self.socket.send(cmd);
				}, 500);

				setTimeout(function () {
					cmd = 'sys.macro_preset ?';
					self.socket.send(cmd);
				}, 1000);
				
				setTimeout(function () {
					cmd = 'sys.macro_name ?';
					self.socket.send(cmd);
				}, 1500);
			}
		});

		// if we get any data, display it to stdout
		self.socket.on('data', function(buffer) {
			let indata = buffer.toString('utf8');
			self.processFeedback(indata);
		});
	}
	else {
		self.log('error', 'Please specify host/port in config.');
	}
};

instance.prototype.initVariables = function () {
	let self = this;

	let variables = [];

	if (self.config.model === 'cp650') {
		variables = [
			{
				label: 'Fader Level',
				name: 'fader_level'
			},
			{
				label: 'Mute Status',
				name: 'mute_status'
			},
			{
				label: 'Current Format Button',
				name: 'format_button'
			}
		];
	}
	else if (self.config.model === 'cp950') {
		variables = [
			{
				label: 'Fader Level',
				name: 'fader_level'
			},
			{
				label: 'Mute Status',
				name: 'mute_status'
			},
			{
				label: 'Current Macro Preset',
				name: 'macro_preset'
			},
			{
				label: 'Current Macro Name',
				name: 'macro_name'
			}
		];
	}

	self.setVariableDefinitions(variables);
};

instance.prototype.initPresets = function () {
	var self = this;
	var presets = [];

	presets.push({
		category: 'Fader Level',
		label: 'Fader +',
		bank: {
			style: 'text',
			text: 'Fader +',
			size: '14',
			color: '16777215',
			bgcolor: self.rgb(0, 0, 0)
		},
		actions: [{
			action: 'fader_increase_timer',
			options: {
				rate: '500'
			}
		}],
		release_actions: [
			{
				action: 'fader_increase_stop'
			}
		]
	});

	presets.push({
		category: 'Fader Level',
		label: 'Fader -',
		bank: {
			style: 'text',
			text: 'Fader -',
			size: '14',
			color: '16777215',
			bgcolor: self.rgb(0, 0, 0)
		},
		actions: [{
			action: 'fader_decrease_timer',
			options: {
				rate: '500'
			}
		}],
		release_actions: [
			{
				action: 'fader_decrease_stop'
			}
		]
	});

	self.setPresetDefinitions(presets);
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	let self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will connect to a Dolby Digital Cinema Processor.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 6,
			default: '192.168.0.1',
			regex: self.REGEX_IP
		},
		{
			type: 'dropdown',
			label: 'Model',
			id: 'model',
			default: 'cp650',
			choices: self.MODELS
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	let self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	//destroy timers
	if (self.TIMER_FADER !== null) {
		clearInterval(this.TIMER_FADER);
		self.TIMER_FADER = null;
	}

	debug('destroy', self.id);
}

instance.prototype.actions = function() {
	let self = this;

	let actions_cp650 = {
		'fader_increase_once': {
			label: 'Increase Fader Level 1 Point and Stop',
		},
		'fader_increase_timer': {
			label: 'Increase Fader Level 1 Point Continuously',
			options: [
				{
					type: 'number',
					label: 'Rate',
					id: 'rate',
					default: '500',
					tooltip: 'Time in milliseconds between increases'
				}
			]
		},
		'fader_increase_stop': {
			label: 'Stop Increasing Fader Level',
		},
		'fader_decrease_once': {
			label: 'Decrease Fader Level 1 Point and Stop',
		},
		'fader_decrease_timer': {
			label: 'Decrease Fader Level 1 Point Continuously',
			options: [
				{
					type: 'number',
					label: 'Rate',
					id: 'rate',
					default: '500',
					tooltip: 'Time in milliseconds between decreases'
				}
			]
		},
		'fader_decrease_stop': {
			label: 'Stop Decreasing Fader Level',
		},
		'fader_setlevel': {
			label: 'Set Fader to Level',
			options: [
				{
					type: 'textinput',
					label: 'Level',
					id: 'level',
					tooltip: 'Sets the level to a specific value (0.0-10.0)',
					default: '8.5',
					required: true
				}
			]
		},
		'set_format_button': {
			label: 'Set Format Button',
			options: [
				{
					type: 'dropdown',
					label: 'Format',
					id: 'format',
					default: '0',
					choices: self.CHOICES_FORMATS
				}
			]
		},
		'mute_on': {
			label: 'Mute On',
		},
		'mute_off': {
			label: 'Mute Off',
		},
		'mute_toggle': {
			label: 'Mute Toggle',
		}
	};

	let actions_cp950 = {
		'fader_increase_once': {
			label: 'Increase Fader Level 1 Point and Stop',
		},
		'fader_increase_timer': {
			label: 'Increase Fader Level 1 Point Continuously',
			options: [
				{
					type: 'number',
					label: 'Rate',
					id: 'rate',
					default: '500',
					tooltip: 'Time in milliseconds between increases'
				}
			]
		},
		'fader_increase_stop': {
			label: 'Stop Increasing Fader Level',
		},
		'fader_decrease_once': {
			label: 'Decrease Fader Level 1 Point and Stop',
		},
		'fader_decrease_timer': {
			label: 'Decrease Fader Level 1 Point Continuously',
			options: [
				{
					type: 'number',
					label: 'Rate',
					id: 'rate',
					default: '500',
					tooltip: 'Time in milliseconds between decreases'
				}
			]
		},
		'fader_decrease_stop': {
			label: 'Stop Decreasing Fader Level',
		},
		'fader_setlevel': {
			label: 'Set Fader to Level',
			options: [
				{
					type: 'textinput',
					label: 'Level',
					id: 'level',
					tooltip: 'Sets the level to a specific value (0.0-10.0)',
					default: '8.5',
					required: true
				}
			]
		},
		'set_macro_preset': {
			label: 'Set Macro by Preset Number',
			options: [
				{
					type: 'number',
					label: 'Macro Preset Number',
					id: 'macro',
					min: 1,
					max: 8,
					default: 1,
					step: 1,
					required: true,
					range: true,
					tooltip: '(1-8)'
				}
			]
		},
		'set_macro_name': {
			label: 'Set Macro by Name',
			options: [
				{
					type: 'textinput',
					label: 'Macro Name',
					id: 'macro',
					default: '<macro name>',
					required: true
				}
			]
		},
		'mute_on': {
			label: 'Mute On',
		},
		'mute_off': {
			label: 'Mute Off',
		}
	};

	switch(self.config.model) {
		case 'cp650':
			self.system.emit('instance_actions', self.id, actions_cp650);
			break;
		case 'cp950':
			self.system.emit('instance_actions', self.id, actions_cp950);
			break;
	}
};

instance.prototype.action = function(action) {

	let self = this;
	let cmd;
	let options = action.options;
	
	switch(action.action) {
		case 'fader_increase_once':
			self.Fader_Change('increase');
			break;
		case 'fader_increase_timer':
			self.Fader_Timer('increase', 'start', options.rate);
			break;
		case 'fader_increase_stop':
			self.Fader_Timer('increase', 'stop', null);
			break;
		case 'fader_decrease_once':
			self.Fader_Change('decrease');
			break;
		case 'fader_decrease_timer':
			self.Fader_Timer('decrease', 'start', options.rate);
			break;
		case 'fader_decrease_stop':
			self.Fader_Timer('decrease', 'stop', null);
			break;
		case 'fader_setlevel':
			if (self.config.model === 'cp650') {
				cmd = 'fader_level=' + (parseFloat(options.level) * 10); //the protocol requires it in 10 but the display uses decimals. i.e. 1.8 = 18
			}
			else if (self.config.model === 'cp950') {
				cmd = 'sys.fader ' + (parseFloat(options.level) * 10); //the protocol requires it in 10 but the display uses decimals. i.e. 1.8 = 18
			}
			break;
		case 'set_format_button':
			if (self.config.model === 'cp650') {
				cmd = 'format_button=' + options.format;
			}
			break;
		case 'set_macro_preset':
			if (self.config.model === 'cp950') {
				cmd = 'sys.macro_preset ' + options.macro;
			}
			break;
		case 'set_macro_name':
			if (self.config.model === 'cp950') {
				cmd = 'sys.macro_name ' + options.macro;
			}
			break;
		case 'mute_on':
			if (self.config.model === 'cp650') {
				cmd = 'mute=1';
			}
			else if (self.config.model === 'cp950') {
				cmd = 'sys.mute 1';
			}
			break;
		case 'mute_off':
			if (self.config.model === 'cp650') {
				cmd = 'mute=0';
			}
			else if (self.config.model === 'cp950') {
				cmd = 'sys.mute 0';
			}
			break;
		case 'mute_toggle':
			if (self.config.model === 'cp650') {
				cmd = 'mute=2';
			}
			break;
	}

	if (cmd !== undefined) {
		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send(cmd + '\r\n');
		} else {
			debug('Socket not connected :(');
		}
	}
	else {
		self.log('error', 'Invalid command: ' + cmd);
	}
};

instance.prototype.Fader_Change = function(direction) {
	let self = this;

	let newLevel = self.FADER_LEVEL;

	if (direction === 'increase') {
		newLevel++;
	}
	else {
		newLevel--;
	}

	if ((newLevel > 100) || (newLevel < 0)) {
		self.Fader_Timer(direction, 'stop', null);
	}
	else {
		let cmd;
		
		if (self.config.model === 'cp650') {
			cmd = 'fader_level=' + newLevel;
		}
		else if (self.config.model === 'cp950') {
			cmd = 'sys.fader ' + newLevel;
		}

		if (cmd) {
			if (self.socket !== undefined && self.socket.connected) {
				self.socket.send(cmd + '\r\n');
			}
			else {
				debug('Socket not connected :(');
			}
		}
	}
};

instance.prototype.Fader_Timer = function(direction, mode, rate) {
	let self = this;

	if (self.TIMER_FADER !== null) {
		clearInterval(self.TIMER_FADER);
		self.TIMER_FADER = null;
	}

	if (mode === 'start') {
		self.TIMER_FADER = setInterval(self.Fader_Change.bind(self), parseInt(rate), direction);
	}
};

instance.prototype.processFeedback = function(data) {
	let self = this;
	let cmdArray;

	if (self.config.model === 'cp650') {
		cmdArray = data.trim().split('=');

		switch(cmdArray[0]) {
			case 'fader_level':
				self.FADER_LEVEL = parseInt(cmdArray[1]);
				let displayLevel = (self.FADER_LEVEL / 10).toFixed(1);
				self.setVariable('fader_level', displayLevel); //divide by 10 so 18 becomes 1.8, etc.
				break;
			case 'mute':
				if (cmdArray[1] === '0') {
					self.setVariable('mute_status', 'Unmuted');
					self.MUTE_STATUS = false;
				}
				else {
					self.setVariable('mute_status', 'Muted');
					self.MUTE_STATUS = true;
				}
				self.checkFeedbacks('mute_status');
				break;
			case 'format_button':
				let value = self.CHOICES_FORMATS.find( ({ id }) => id === cmdArray[1]).label;
				self.setVariable('format_button', value);
				break;
		}
	}
	else if (self.config.model === 'cp950') {
		data = data.trim()
		let cmdString = data.substring(0, data.indexOf(' '));
		let cmdValue = data.substring(data.indexOf(' ') + 1);

		switch(cmdString) {
			case 'sys.fader':
				self.FADER_LEVEL = parseInt(cmdValue);
				let displayLevel = (self.FADER_LEVEL / 10).toFixed(1);
				self.setVariable('fader_level', displayLevel); //divide by 10 so 18 becomes 1.8, etc.
				break;
			case 'sys.mute':
				if (cmdValue === '0') {
					self.setVariable('mute_status', 'Unmuted');
					self.MUTE_STATUS = false;
				}
				else {
					self.setVariable('mute_status', 'Muted');
					self.MUTE_STATUS = true;
				}
				self.checkFeedbacks('mute_status');
				break;
			case 'sys.macro_name':
				self.setVariable('macro_name', cmdValue);
				break;
			case 'sys.macro_preset':
				self.setVariable('macro_preset', cmdValue);
				break;
		}
	}
};

instance.prototype.initFeedbacks = function () {
	let self = this;

	// feedbacks
	let feedbacks = {};

	feedbacks['mute_status'] = {
		label: 'Change Button Color If Muted',
		description: 'If muted, set the button to this color.',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(0,255,0)
			},
		]
	};

	self.setFeedbackDefinitions(feedbacks);
}

instance.prototype.feedback = function(feedback, bank) {
	let self = this;
	
	if (feedback.type === 'mute_status') {
		if (self.MUTE_STATUS === true) {
			return { color: feedback.options.fg, bgcolor: feedback.options.bg };
		}
	}

	return {};
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;