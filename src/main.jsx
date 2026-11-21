import { render } from 'preact'
import './styles/tokens.css'
import './styles/base.css'
import { App } from './app.jsx'
import { initNative } from './lib/native.js'
import { initInstall } from './lib/install.js'

initNative()
initInstall()
render(<App />, document.getElementById('app'))
