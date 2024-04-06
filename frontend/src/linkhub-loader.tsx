import React from 'react';
import ReactDOM from 'react-dom';
import LinkHubViewer from './components/LinkHubViewer';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

ReactDOM.render(
  <BrowserRouter>
    <Switch>
      <Route exact path='/h/:alias' render={() => <LinkHubViewer/>}/>
    </Switch>
  </BrowserRouter>,
  document.getElementById('react'),
);
