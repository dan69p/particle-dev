{DialogView} = require 'particle-dev-views'
packageName = require '../utils/package-helper'
_s = null

module.exports =
class ClaimCoreView extends DialogView
  constructor: ->
    super
      prompt: 'Enter device ID (hex string)'
      initialText: ''
      select: false
      iconClass: ''
      hideOnBlur: false

    @claimPromise = null
    @main = null
    @prop 'id', 'claim-core-view'
    @addClass packageName()
    @workspaceElement = atom.views.getView(atom.workspace)

  # When deviceID is submited
  onConfirm: (deviceID) ->
    _s ?= require 'underscore.string'

    # Remove any errors
    @miniEditor.editor.removeClass 'editor-error'
    # Trim deviceID from any whitespaces
    deviceID = _s.trim(deviceID)

    if deviceID == ''
      # Empty deviceID is not allowed
      @miniEditor.editor.addClass 'editor-error'
    else
      # Lock input
      @miniEditor.setEnabled false
      @miniEditor.setLoading true

      spark = require 'spark'
      spark.login { accessToken: @main.profileManager.accessToken }

      # Claim core via API
      @claimPromise = spark.claimCore deviceID
      @setLoading true
      @claimPromise.then (e) =>
        @miniEditor.setLoading false
        if e.ok
          if !@claimPromise
            return

          # Set current core in settings
          device = new @main.profileManager.Device()
          device.id = e.id
          @main.profileManager.currentDevice = device

          # Refresh UI
          atom.commands.dispatch @workspaceElement, "#{packageName()}:update-core-status"
          atom.commands.dispatch @workspaceElement, "#{packageName()}:update-menu"

          @claimPromise = null
          @close()
        else
          @miniEditor.setEnabled true
          @miniEditor.editor.addClass 'editor-error'
          if e.errors.length == 2
            delete e.errors[1]
          @showError e.errors

          @claimPromise = null

      , (e) =>
        @setLoading false
        # Show error
        return
        @miniEditor.setEnabled true

        if e.code == 'ENOTFOUND'
          message = 'Error while connecting to ' + e.hostname
          @showError message
        else
          @miniEditor.editor.addClass 'editor-error'
          @showError e.errors

        @claimPromise = null
