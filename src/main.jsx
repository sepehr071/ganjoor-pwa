import { render } from 'preact'
import './styles/tokens.css'
import './styles/base.css'
import { App } from './app.jsx'
import { initNative } from './lib/native.js'

initNative()
render(<App />, document.getElementById('app'))
