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

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.port === undefined) {
		self.config.port = 61412;
	}

	if (self.config.host) {
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
			let cmd = 'all=?\r\n';
			self.socket.send(cmd);
		});

		// if we get any data, display it to stdout
		self.socket.on('data', function(buffer) {
			let indata = buffer.toString('utf8');
			self.processFeedback(indata);
		});
	}
};

instance.prototype.initVariables = function () {
	let self = this;

	let variables = [
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
	}

	debug('destroy', self.id);
}

instance.prototype.actions = function() {
	let self = this;

	self.system.emit('instance_actions', self.id, {

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
					type: 'number',
					label: 'Level',
					id: 'level',
					tooltip: 'Sets the level to a specific value (0-100)',
					min: 0,
					max: 100,
					default: 85,
					required: true,
					range: true
				}
			]
		},
		'set_format_button': {
			label: 'Set Format Button',
			options: [
				{
					type: 'dropdown',
					lael: 'Format',
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

	});
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
			cmd = 'fader_level=' + options.level;
			break;
		case 'set_format_button':
			cmd = 'format_button=' + options.format;
			break;
		case 'mute_on':
			cmd = 'mute=1';
			break;
		case 'mute_off':
			cmd = 'mute=0';
			break;
		case 'mute_toggle':
			cmd = 'mute=2';
			break;
	}

	if (cmd !== undefined) {
		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send(cmd + '\r\n');
		} else {
			debug('Socket not connected :(');
		}
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
		let cmd = 'fader_level=' + newLevel;

		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send(cmd + '\r\n');
		} else {
			debug('Socket not connected :(');
		}
	}
};

instance.prototype.Fader_Timer = function(direction, mode, rate) {
	let self = this;

	if (self.TIMER_FADER !== null) {
		clearInterval(self.TIMER_FADER);
	}

	if (mode === 'start') {
		self.TIMER_FADER = setInterval(self.Fader_Change.bind(self), parseInt(rate), direction);
	}
};

instance.prototype.processFeedback = function(data) {
	let self = this;
	let cmdValue = data.trim().split('=');

	switch(cmdValue[0]) {
		case 'fader_level':
			self.FADER_LEVEL = parseInt(cmdValue[1]);
			self.setVariable('fader_level', self.FADER_LEVEL);
			break;
		case 'mute':
			if (cmdValue[1] === '0') {
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
			let value = self.CHOICES_FORMATS.find( ({ id }) => id === cmdValue[1]).label;
			self.setVariable('format_button', value);
			break;
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