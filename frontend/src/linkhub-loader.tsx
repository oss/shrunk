import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import LinkHubPage from './pages/LinkHubPage';

const container = document.getElementById('react');
const root = createRoot(container!);
root.render(
  <BrowserRouter>
    <Switch>
      <Route exact path="/h/:alias" render={() => <LinkHubPage />} />
    </Switch>
  </BrowserRouter>,
);
