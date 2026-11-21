import './styles/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { startAutosave } from './lib/state/app.svelte';

startAutosave();
mount(App, { target: document.getElementById('app')! });
