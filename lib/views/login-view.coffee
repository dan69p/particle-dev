{View, $} = require 'atom-space-pen-views'
{MiniEditorView} = require 'particle-dev-views'
packageName = require '../utils/package-helper'

CompositeDisposable = null
_s = null
spark = null
SettingsHelper = null
validator = null

module.exports =
class LoginView extends View
  @content: ->
    @div id: 'login-view', class: packageName(), =>
      @div class: 'block', =>
        @span 'Log in to Particle Cloud '
        @span class: 'text-subtle', =>
          @text 'Close this dialog with the '
          @span class: 'highlight', 'esc'
          @span ' key'
      @subview 'emailEditor', new MiniEditorView('Could I please have an email address?')
      @subview 'passwordEditor', new MiniEditorView('and a password?')
      @div class: 'text-error block', outlet: 'errorLabel'
      @div class: 'block', =>
        @button click: 'login', id: 'loginButton', class: 'btn btn-primary', outlet: 'loginButton', tabindex: 3, 'Log in'
        @button click: 'cancel', id: 'cancelButton', class: 'btn', outlet: 'cancelButton', tabindex: 4, 'Cancel'
        @span class: 'three-quarters inline-block hidden', outlet: 'spinner'
        @a href: 'https://build.particle.io/forgot-password', class: 'pull-right', tabindex: 5, 'Forgot password?'

  initialize: (serializeState) ->
    {CompositeDisposable} = require 'atom'
    _s ?= require 'underscore.string'
    SettingsHelper = require '../utils/settings-helper'

    @panel = atom.workspace.addModalPanel(item: this, visible: false)
    @workspaceElement = atom.views.getView(atom.workspace)

    @disposables = new CompositeDisposable
    @disposables.add atom.commands.add 'atom-workspace',
      'core:cancel', =>
        atom.commands.dispatch @workspaceElement, "#{packageName()}:cancel-login"
      'core:close', =>
        atom.commands.dispatch @workspaceElement, "#{packageName()}:cancel-login"


    @loginPromise = null

    @emailModel = @emailEditor.editor.getModel()
    @emailEditor.editor.element.setAttribute('tabindex', 1)
    @passwordModel = @passwordEditor.editor.getModel()
    @passwordEditor.editor.element.setAttribute('tabindex', 2)
    passwordElement = $(@passwordEditor.editor.element.rootElement)
    passwordElement.find('div.lines').addClass('password-lines')
    @passwordModel.onDidChange =>
      string = @passwordModel.getText().split('').map(->
        '*'
      ).join ''

      passwordElement.find('#password-style').remove()
      passwordElement.append('<style id="password-style">.password-lines .line span.syntax--text:before {content:"' + string + '";}</style>')
    @disposables.add atom.commands.add @passwordEditor.editor.element,
      'core:confirm': =>
        @login()

  # Returns an object that can be retrieved when package is activated
  serialize: ->

  # Tear down any state and detach
  destroy: ->
    panelToDestroy = @panel
    @panel = null
    panelToDestroy?.destroy()

    @disposables.dispose()

  show: =>
    @panel.show()
    @emailEditor.editor.focus()

  hide: ->
    @panel.hide()
    @unlockUi()
    @clearErrors()
    @emailModel.setText ''
    @passwordModel.setText ''
    @errorLabel.hide()

  cancel: (event, element) =>
    if !!@loginPromise
      @loginPromise = null
    @hide()

  cancelCommand: ->
    @cancel()

  # Remove errors from inputs
  clearErrors: ->
    @emailEditor.editor.removeClass 'editor-error'
    @passwordEditor.editor.removeClass 'editor-error'

  # Test input's values
  validateInputs: ->
    validator ?= require 'validator'

    @clearErrors()

    @email = _s.trim(@emailModel.getText())
    @password = _s.trim(@passwordModel.getText())

    isOk = true

    if (@email == '') || (!validator.isEmail(@email))
      @emailEditor.editor.addClass 'editor-error'
      isOk = false

    if @password == ''
      @passwordEditor.editor.addClass 'editor-error'
      isOk = false

    isOk

  # Unlock inputs and buttons
  unlockUi: ->
    @emailEditor.setEnabled true
    @passwordEditor.setEnabled true
    @loginButton.removeAttr 'disabled'

  # Login via the cloud
  login: (event, element) =>
    if !@validateInputs()
      return false

    @emailEditor.setEnabled false
    @passwordEditor.setEnabled false
    @loginButton.attr 'disabled', 'disabled'
    @spinner.removeClass 'hidden'
    @errorLabel.hide()

    spark = require 'spark'
    @loginPromise = spark.login { username:@email, password:@password }
    @loginPromise.then (e) =>
      @spinner.addClass 'hidden'
      if !@loginPromise
        return
      SettingsHelper.setCredentials @email, e.access_token
      atom.commands.dispatch @workspaceElement, "#{packageName()}:update-login-status"
      @loginPromise = null

      @cancel()

    , (e) =>
      @spinner.addClass 'hidden'
      if !@loginPromise
        return
      @unlockUi()
      if e.code == 'ENOTFOUND'
        @errorLabel.text 'Error while connecting to ' + e.hostname
      else if e.message == 'invalid_grant'
        @errorLabel.text 'Invalid email or password'
      else
        @errorLabel.text e

      @errorLabel.show()
      @loginPromise = null

  # Logout
  logout: =>
    SettingsHelper.clearCredentials()
    atom.commands.dispatch @workspaceElement, "#{packageName()}:update-login-status"
