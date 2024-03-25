const { InstanceStatus, TCPHelper } = require('@companion-module/base')

module.exports = {
	initConnection: function () {
		let self = this
		let cmd

		if (self.socket !== undefined) {
			self.socket.destroy()
			delete self.socket
		}

		//get port from model
		let modelObj = self.MODELS.find(({ id }) => id === self.config.model)

		if (modelObj) {
			self.config.port = modelObj.port
		} else {
			//assume cp750
			self.config.port = 61408
		}

		if (self.config.host && self.config.port) {
			self.socket = new TCPHelper(self.config.host, self.config.port)

			self.socket.on('error', function (err) {
				self.log('error', 'Network error: ' + err.message)
			})

			self.socket.on('connect', function () {
				self.updateStatus(InstanceStatus.Ok)

				if (self.config.model === 'cp650') {
					cmd = 'all=?\r\n'
					self.socket.send(cmd)
				} else {
					let prefix = ''
					if (self.config.model === 'cp750') {
						prefix = 'cp750.'
					}
					cmd = prefix + 'sys.fader ?'
					self.socket.send(cmd)

					setTimeout(function () {
						let prefix = ''
						if (self.config.model === 'cp750') {
							prefix = 'cp750.'
						}
						cmd = prefix + 'sys.mute ?'
						self.socket.send(cmd)
					}, 500)

					setTimeout(function () {
						let prefix = ''
						if (self.config.model === 'cp750') {
							prefix = 'cp750.'
						}
						cmd = prefix + 'sys.macro_preset ?'
						self.socket.send(cmd)
					}, 1000)

					setTimeout(function () {
						let prefix = ''
						if (self.config.model === 'cp750') {
							prefix = 'cp750.'
						}
						cmd = prefix + 'sys.macro_name ?'
						self.socket.send(cmd)
					}, 1500)
				}
			})

			self.socket.on('data', function (buffer) {
				let indata = buffer.toString('utf8')
				self.processFeedback(indata)
			})
		}
	},

	sendCommand: function (cmd) {
		let self = this

		if (self.socket !== undefined && self.socket.isConnected) {
			self.socket.send(cmd + '\r\n')
		} else {
			self.log('error', 'Socket not connected :(')
		}
	},

	Fader_Change: function (direction) {
		let self = this

		let newLevel = self.FADER_LEVEL

		if (direction === 'increase') {
			newLevel++
		} else {
			newLevel--
		}

		if (newLevel > 100 || newLevel < 0) {
			self.Fader_Timer(direction, 'stop', null)
		} else {
			let cmd

			if (self.config.model === 'cp650') {
				cmd = 'fader_level=' + newLevel
			} else {
				let prefix = ''
				if (self.config.model === 'cp750') {
					prefix = 'cp750.'
				}
				cmd = prefix + 'sys.fader ' + newLevel
			}

			if (cmd) {
				self.sendCommand(cmd)
			}
		}
	},

	Fader_Timer: function (direction, mode, rate) {
		let self = this

		if (self.TIMER_FADER !== null) {
			clearInterval(self.TIMER_FADER)
			self.TIMER_FADER = null
		}

		if (mode === 'start') {
			self.TIMER_FADER = setInterval(self.Fader_Change.bind(self), parseInt(rate), direction)
		}
	},

	processFeedback: function (data) {
		let self = this
		let cmdArray

		let variableObj = {}

		let displayLevel, value

		if (self.config.model === 'cp650') {
			cmdArray = data.trim().split('=') //split the data into an array

			switch (cmdArray[0]) {
				case 'fader_level':
					self.FADER_LEVEL = parseInt(cmdArray[1])
					displayLevel = (self.FADER_LEVEL / 10).toFixed(1)

					variableObj['fader_level'] = displayLevel
					break
				case 'mute':
					if (cmdArray[1] === '0') {
						variableObj['mute_status'] = 'Unmuted'
						self.MUTE_STATUS = false
					} else {
						variableObj['mute_status'] = 'Muted'
						self.MUTE_STATUS = true
					}
					self.checkFeedbacks('mute_status')
					break
				case 'format_button':
					value = self.CHOICES_FORMATS.find(({ id }) => id === cmdArray[1]).label
					variableObj['format_button'] = value
					break
			}
		} else {
			data = data.trim()
			let cmdString = data.substring(0, data.indexOf(' ')).replace('cp750.', '')
			let cmdValue = data.substring(data.indexOf(' ') + 1)

			switch (cmdString) {
				case 'sys.fader':
					self.FADER_LEVEL = parseInt(cmdValue)
					displayLevel = (self.FADER_LEVEL / 10).toFixed(1)
					variableObj['fader_level'] = displayLevel
					break
				case 'sys.mute':
					if (cmdValue === '0') {
						variableObj['mute_status'] = 'Unmuted'
						self.MUTE_STATUS = false
					} else {
						variableObj['mute_status'] = 'Muted'
						self.MUTE_STATUS = true
					}
					self.checkFeedbacks('mute_status')
					break
				case 'sys.macro_name':
					variableObj['macro_name'] = cmdValue
					break
				case 'sys.macro_preset':
					variableObj['macro_preset'] = cmdValue
					break
			}
		}

		self.setVariableValues(variableObj)
	},
}
