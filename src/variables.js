module.exports = {
	initVariables: function () {
		let self = this
		let variables = []

		variables.push({ variableId: 'fader_level', name: 'Fader Level' })
		variables.push({ variableId: 'mute_status', name: 'Mute Status' })

		if (self.config.model === 'cp650') {
			variables.push({ variableId: 'format_button', name: 'Current Format Button' })
		} else if (self.config.model === 'cp950') {
			variables.push({ variableId: 'macro_preset', name: 'Current Macro Preset' })
			variables.push({ variableId: 'macro_name', name: 'Current Macro Name' })
		}

		self.setVariableDefinitions(variables)
	},
}
