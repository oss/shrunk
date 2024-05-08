import React from 'react';
import ReactDOM from 'react-dom';
import LinkHubPage from './pages/LinkHubPage';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

ReactDOM.render(
  <BrowserRouter>
    <Switch>
      <Route exact path="/h/:alias" render={() => <LinkHubPage />} />
    </Switch>
  </BrowserRouter>,
  document.getElementById('react'),
);
