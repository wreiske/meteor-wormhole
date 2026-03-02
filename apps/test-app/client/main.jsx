import './styles.css';

import { Meteor } from 'meteor/meteor';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '../imports/ui/App';

Meteor.startup(() => {
  const el = document.getElementById('root');
  if (!el) return;
  createRoot(el).render(<App />);
});
